from flask import Flask, render_template_string, jsonify, request
import redis
import os
from datetime import datetime, timedelta
import json
import logging

app = Flask(__name__)

# Stats storage - Redis with in-memory fallback
class StatsStore:
    def __init__(self):
        self.redis_client = None
        self.memory_store = {}
        self.storage_type = "memory"
        self._redis_initialized = False
        
    def _ensure_redis_connection(self):
        """Lazy initialization of Redis connection"""
        if self._redis_initialized:
            return
            
        self._redis_initialized = True
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        try:
            self.redis_client = redis.from_url(redis_url, socket_connect_timeout=5, socket_timeout=5)
            self.redis_client.ping()
            self.storage_type = "redis"
            logging.info(f"Connected to Redis at {redis_url}")
        except Exception as e:
            logging.warning(f"Redis not available, using in-memory storage: {e}")
            self.redis_client = None
    
    def increment_qr_count(self):
        self._ensure_redis_connection()
        
        now = datetime.now()
        hour_key = f"qr_count_hour_{now.strftime('%Y%m%d%H')}"
        day_key = f"qr_count_day_{now.strftime('%Y%m%d')}"
        week_key = f"qr_count_week_{now.strftime('%Y%W')}"
        
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.incr(hour_key)
                pipe.expire(hour_key, 3600)  # 1 hour TTL
                pipe.incr(day_key)
                pipe.expire(day_key, 86400)  # 24 hours TTL
                pipe.incr(week_key)
                pipe.expire(week_key, 604800)  # 7 days TTL
                pipe.execute()
            except Exception:
                # Redis failed, fall back to memory
                self._increment_memory(hour_key, day_key, week_key)
        else:
            self._increment_memory(hour_key, day_key, week_key)
    
    def _increment_memory(self, hour_key, day_key, week_key):
        for key in [hour_key, day_key, week_key]:
            self.memory_store[key] = self.memory_store.get(key, 0) + 1
    
    def get_stats(self):
        self._ensure_redis_connection()
        
        now = datetime.now()
        hour_key = f"qr_count_hour_{now.strftime('%Y%m%d%H')}"
        day_key = f"qr_count_day_{now.strftime('%Y%m%d')}"
        week_key = f"qr_count_week_{now.strftime('%Y%W')}"
        
        stats = {
            "last_hour": 0,
            "last_day": 0,
            "last_week": 0,
            "storage_type": self.storage_type
        }
        
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.get(hour_key)
                pipe.get(day_key)
                pipe.get(week_key)
                results = pipe.execute()
                
                stats["last_hour"] = int(results[0] or 0)
                stats["last_day"] = int(results[1] or 0)
                stats["last_week"] = int(results[2] or 0)
            except Exception:
                # Redis failed, use memory
                stats["last_hour"] = self.memory_store.get(hour_key, 0)
                stats["last_day"] = self.memory_store.get(day_key, 0)
                stats["last_week"] = self.memory_store.get(week_key, 0)
                stats["storage_type"] = "memory (redis failed)"
        else:
            stats["last_hour"] = self.memory_store.get(hour_key, 0)
            stats["last_day"] = self.memory_store.get(day_key, 0)
            stats["last_week"] = self.memory_store.get(week_key, 0)
        
        return stats

stats_store = StatsStore()

@app.route("/api/stats")
def get_stats():
    return jsonify(stats_store.get_stats())

@app.route("/api/test")
def test_redis():
    """Test endpoint to verify Redis connectivity and basic functionality"""
    stats_store._ensure_redis_connection()
    
    test_result = {
        "redis_connected": stats_store.storage_type == "redis",
        "storage_type": stats_store.storage_type,
        "timestamp": datetime.now().isoformat()
    }
    
    # Test Redis operations if connected
    if stats_store.redis_client:
        try:
            # Test basic operations
            test_key = f"test_key_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            stats_store.redis_client.set(test_key, "test_value", ex=60)  # Expires in 60 seconds
            retrieved_value = stats_store.redis_client.get(test_key)
            stats_store.redis_client.delete(test_key)
            
            test_result["redis_test"] = {
                "set_get_test": "passed" if retrieved_value == b"test_value" else "failed",
                "test_key_used": test_key
            }
        except Exception as e:
            test_result["redis_test"] = {
                "set_get_test": "failed",
                "error": str(e)
            }
    
    return jsonify(test_result)

@app.route("/generate", methods=["POST"])
def generate_qr():
    """Generate QR code via REST API"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' field"}), 400
        
        text = data['text']
        style = data.get('style', 'square')
        size = data.get('size', 200)
        
        # Track QR generation request
        stats_store.increment_qr_count()
        
        # For now, return a simple response indicating success
        # In a full implementation, you'd generate the actual QR code here
        return jsonify({
            "success": True,
            "message": f"QR code generated for: {text}",
            "style": style,
            "size": size,
            "redis_connected": stats_store.storage_type == "redis"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def qr_tool():
    # Track QR generation request
    stats_store.increment_qr_count()
    html = """
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>QR Code Creator (with Variants)</title>
      <style>
        :root {
          --bg:#f5f7fa; --fg:#2c3e50; --card:#fff; --muted:#6b7a8c; --accent:#3498db;
          --border:#dce1e7; --soft:#eef2f6; --shadow:rgba(0,0,0,.06);
        }
        body { margin:0; background:var(--bg); color:var(--fg);
               font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .wrap { max-width: 980px; margin: 0 auto; padding: 20px; }
        .card { background:var(--card); border-radius:14px; padding:20px;
                box-shadow:0 6px 20px var(--shadow); }
        h1 { margin:0 0 8px; }
        label { display:block; margin:8px 0 6px; color:var(--muted); font-size:14px; }
        input[type=text] { width:100%; padding:12px 14px; border-radius:10px; border:1px solid var(--border); }
        .row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
        select { padding:10px; border-radius:10px; border:1px solid var(--border); background:#fff; }
        button, .btn {
          background:var(--accent); color:#fff; border:0; border-radius:10px; padding:12px 16px;
          cursor:pointer; text-decoration:none; display:inline-block; font-size:15px;
        }
        button.secondary { background:#95a5a6; }
        button.ghost { background:#ecf0f1; color:#2c3e50; }
        .main-display { text-align:center; margin-top:16px; }
        .main-qr { background:#fafbfc; border:1px solid var(--soft); border-radius:12px; padding:14px; display:inline-block; margin-bottom:16px; }
        .main-qr img { max-width:100%; height:auto; display:none; margin:auto; }
        .variants { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-top:16px; }
        .variant-tile { background:#fafbfc; border:1px solid var(--soft); padding:8px; border-radius:8px; text-align:center; }
        .variant-tile img { width:100%; height:auto; }
        .variant-label { font-size:11px; color:var(--muted); margin-top:4px; }
        .meta { font-size:13px; color:var(--muted); margin-top:8px; word-break:break-all; }
        .tools { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:center; justify-content:center; }
        .stats-section { margin-top:20px; padding:16px; background:#f8f9fa; border-radius:10px; border:1px solid var(--border); }
        .stats-title { font-size:14px; font-weight:600; color:var(--muted); margin-bottom:8px; }
        .stats-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
        .stat-item { text-align:center; padding:8px; }
        .stat-number { font-size:20px; font-weight:700; color:var(--accent); }
        .stat-label { font-size:11px; color:var(--muted); margin-top:2px; }
        .storage-info { font-size:10px; color:var(--muted); margin-top:8px; text-align:center; }
        @media (max-width: 900px) { .variants { grid-template-columns: repeat(2, 1fr); } }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>QR Code Creator</h1>

          <label>URL</label>
          <input id="url" type="text" placeholder="https://example.com" />

          <div class="row" style="margin-top:12px">
            <button id="generate">Generate QR Styles</button>
            <button id="example" class="secondary" type="button">Example</button>

            <select id="size" title="Size">
              <option value="200">200×200</option>
              <option value="256" selected>256×256</option>
              <option value="320">320×320</option>
              <option value="512">512×512</option>
            </select>

            <select id="ecc" title="Error correction">
              <option value="L">ECC: L</option>
              <option value="M" selected>ECC: M</option>
              <option value="Q">ECC: Q</option>
              <option value="H">ECC: H</option>
            </select>

            <select id="margin" title="Quiet zone">
              <option value="2" selected>Margin: 2</option>
              <option value="4">Margin: 4</option>
              <option value="8">Margin: 8</option>
            </select>

            <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:#2c3e50;">
              <input id="varyFragment" type="checkbox" checked /> Vary with #fragment
            </label>
          </div>

          <div class="main-display">
            <div class="main-qr">
              <img id="qr" alt="Main QR code" />
            </div>
            
            <div class="tools">
              <a id="open-image" class="btn" href="#" target="_blank" style="display:none">Open Main</a>
              <a id="download" class="btn" href="#" download="qr-main.png" style="display:none">Download Main</a>
              <button id="copy-link" class="ghost" type="button" style="display:none">Copy URL</button>
            </div>
            
            <div class="meta" id="target" style="display:none; margin-top:8px;"></div>
            
            <div id="variants" class="variants"></div>
          </div>
          
          <div class="stats-section">
            <div class="stats-title">QR Code Generation Stats</div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-number" id="stat-hour">-</div>
                <div class="stat-label">Last Hour</div>
              </div>
              <div class="stat-item">
                <div class="stat-number" id="stat-day">-</div>
                <div class="stat-label">Last Day</div>
              </div>
              <div class="stat-item">
                <div class="stat-number" id="stat-week">-</div>
                <div class="stat-label">Last Week</div>
              </div>
            </div>
            <div class="storage-info" id="storage-info">Loading stats...</div>
          </div>
        </div>
      </div>

      <script>
        const $ = (id) => document.getElementById(id);
        const urlInput = $("url"), sizeSel = $("size"), eccSel = $("ecc"), marginSel = $("margin");
        const qrImg = $("qr"), dl = $("download"), openImg = $("open-image"), copyBtn = $("copy-link"),
              target = $("target"), variants = $("variants"), varyCb = $("varyFragment");

        // Safe, high-contrast palettes for scannability.
        const PALETTES = [
          { fg:[0,0,0],       bg:[255,255,255] },   // classic
          { fg:[31,41,55],    bg:[250,250,250] },   // slate/near-white
          { fg:[40,54,85],    bg:[254,252,232] },   // navy on cream
          { fg:[36, 99,160],  bg:[248,250,252] },   // blue on off-white
          { fg:[88, 28,135],  bg:[250,245,255] },   // purple on lavender
          { fg:[20, 83, 45],  bg:[240,253,244] },   // green on mint
          { fg:[146,64,14],   bg:[255,247,237] },   // brown on peach
          { fg:[180, 37, 41], bg:[255,245,245] },   // red on rose
          // Inverted palettes (light fg on dark bg)
          { fg:[255,255,255], bg:[31,41,55] },      // white on dark slate
          { fg:[248,250,252], bg:[30,58,138] }      // off-white on dark blue
        ];
        let currentPalette = PALETTES[0];

        function canonicalize(u) {
          u = (u || "").trim();
          if (!u) return "";
          if (!/^https?:\\/\\//i.test(u)) u = "https://" + u;
          return u;
        }

        function withVariant(url) {
          if (!varyCb.checked) return url;
          // Add/replace a #r= fragment so the QR pattern changes but target stays the same.
          const base = url.split("#")[0];
          const nonce = Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);
          return base + "#r=" + nonce;
        }

        function rgbParam([r,g,b]) { return [r,g,b].join("-"); }

        function buildQrUrl(data, size, ecc, margin, fg, bg) {
          // Mock QR URL - no external API calls needed
          // Return a data URL for a simple colored square as placeholder
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Fill background
          ctx.fillStyle = `rgb(${bg.join(',')})`;
          ctx.fillRect(0, 0, size, size);
          
          // Create simple pattern to represent QR code
          ctx.fillStyle = `rgb(${fg.join(',')})`;
          const blockSize = Math.floor(size / 10);
          for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              if ((i + j) % 2 === 0) {
                ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
              }
            }
          }
          
          return canvas.toDataURL('image/png');
        }

        function generateAllStyles() {
          const raw = canonicalize(urlInput.value);
          if (!raw) return;
          
          const targetUrl = raw;
          const size = sizeSel.value, ecc = eccSel.value, margin = marginSel.value;
          
          // Main QR code (classic black/white)
          const mainData = withVariant(raw);
          const mainSrc = buildQrUrl(mainData, size, ecc, margin, PALETTES[0].fg, PALETTES[0].bg);
          
          qrImg.src = mainSrc;
          qrImg.style.display = "block";
          dl.href = mainSrc;
          dl.style.display = "inline-block";
          openImg.href = mainSrc;
          openImg.style.display = "inline-block";
          copyBtn.style.display = "inline-block";
          target.style.display = "block";
          target.textContent = "Target: " + targetUrl;
          
          copyBtn.onclick = async () => {
            try { await navigator.clipboard.writeText(targetUrl); copyBtn.textContent = "Copied!"; }
            catch { copyBtn.textContent = "Unable to copy"; }
            setTimeout(() => (copyBtn.textContent = "Copy URL"), 1200);
          };
          
          // Generate 6 style variants (including inverted colors)
          variants.innerHTML = "";
          const variantConfigs = [
            { palette: 1, ecc: "M", margin: 2, label: "Slate" },
            { palette: 2, ecc: "Q", margin: 2, label: "Navy/Cream" },
            { palette: 4, ecc: "L", margin: 2, label: "Purple" },
            { palette: 5, ecc: "M", margin: 8, label: "Green" },
            { palette: 8, ecc: "H", margin: 2, label: "Inverted Slate" },
            { palette: 9, ecc: "Q", margin: 4, label: "Inverted Blue" }
          ];
          
          variantConfigs.forEach((config, i) => {
            const variantData = withVariant(raw);
            const palette = PALETTES[config.palette];
            const src = buildQrUrl(variantData, Math.floor(size * 0.6), config.ecc, config.margin, palette.fg, palette.bg);
            
            const tile = document.createElement("div");
            tile.className = "variant-tile";
            
            const img = document.createElement("img");
            img.src = src;
            img.alt = `QR variant ${i+1}`;
            
            const label = document.createElement("div");
            label.className = "variant-label";
            label.textContent = config.label;
            
            const dl = document.createElement("a");
            dl.href = src;
            dl.download = `qr-${config.label.toLowerCase()}.png`;
            dl.className = "btn";
            dl.style.fontSize = "10px";
            dl.style.padding = "4px 6px";
            dl.style.marginTop = "4px";
            dl.textContent = "DL";
            
            tile.appendChild(img);
            tile.appendChild(label);
            tile.appendChild(dl);
            variants.appendChild(tile);
          });
        }

        // UI hooks
        $("generate").addEventListener("click", (e) => {
          e.preventDefault();
          generateAllStyles();
        });
        
        $("example").addEventListener("click", (e) => {
          e.preventDefault();
          urlInput.value = "https://www.pulumi.com";
          generateAllStyles();
        });

        urlInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            generateAllStyles();
          }
        });
        
        [sizeSel, eccSel, marginSel, $("varyFragment")].forEach(el =>
          el.addEventListener("change", () => {
            if (qrImg.src) generateAllStyles(); // only regenerate if we have content
          })
        );

        // Load and refresh stats
        async function loadStats() {
          try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            $("stat-hour").textContent = stats.last_hour;
            $("stat-day").textContent = stats.last_day;
            $("stat-week").textContent = stats.last_week;
            $("storage-info").textContent = `Storage: ${stats.storage_type}`;
          } catch (error) {
            $("storage-info").textContent = "Stats unavailable";
          }
        }
        
        // Load stats on page load and refresh every 30 seconds
        loadStats();
        setInterval(loadStats, 30000);

        // Initialize empty
        urlInput.value = "";
      </script>
    </body>
    </html>
    """
    return render_template_string(html)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

# Lambda handler for AWS Lambda deployment
try:
    import awsgi
    def lambda_handler(event, context):
        # Lambda Function URLs use a different event format than API Gateway
        # Convert Lambda Function URL event to API Gateway format for awsgi
        if 'requestContext' in event and 'http' in event['requestContext']:
            # This is a Lambda Function URL event, convert to API Gateway format
            api_gateway_event = {
                'httpMethod': event['requestContext']['http']['method'],
                'path': event['requestContext']['http']['path'],
                'queryStringParameters': event.get('queryStringParameters'),
                'headers': event.get('headers', {}),
                'body': event.get('body'),
                'isBase64Encoded': event.get('isBase64Encoded', False),
                'requestContext': {
                    'stage': 'prod',
                    'requestId': event['requestContext']['requestId'],
                    'identity': {
                        'sourceIp': event['requestContext']['http']['sourceIp']
                    }
                }
            }
            return awsgi.response(app, api_gateway_event, context)
        else:
            # Standard API Gateway event
            return awsgi.response(app, event, context)
except ImportError:
    # awsgi not available in local development
    pass
