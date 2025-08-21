from flask import Flask, render_template_string

app = Flask(__name__)

@app.route("/")
def qr_tool():
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
          const base = "https://api.qrserver.com/v1/create-qr-code/";
          const q = new URLSearchParams({
            size: size + "x" + size,
            data: data,
            ecc: ecc,
            margin: String(margin),
            color: rgbParam(fg),
            bgcolor: rgbParam(bg),
            format: "png",
            t: Date.now().toString() // cache-bust
          });
          return base + "?" + q.toString();
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

        // Initialize empty
        urlInput.value = "";
      </script>
    </body>
    </html>
    """
    return render_template_string(html)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
