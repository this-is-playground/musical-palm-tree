# 001-Base - Pure Application (0 lines infrastructure)

This is where **every application starts** - just the Flask app with no cloud infrastructure at all.

## What This Shows

- **Pure Flask Application** - QR code generator with embedded frontend
- **Local Development** - Docker Compose with Redis for stats
- **Zero Cloud Infrastructure** - No AWS, no deployment complexity
- **The Starting Point** - Before any AI gets involved

## Architecture

```
Local Development:
Browser → Flask App (port 8080) → Local Redis
                ↓
        Local file storage only
```

## Features

- QR code generation with multiple styling options
- Usage statistics stored in Redis
- Responsive web interface
- Docker containerization for consistency

## Development

```bash
# Local development
source util/functions
start_local

# Or direct commands
python3 -m venv venv
source venv/bin/activate
pip install -r service/requirements.txt
python service/app.py
```

## Docker Development

```bash
source util/functions  
docker_up    # Starts Flask + Redis
stop_docker  # Stops everything
```

## What Happens Next

This simple app works perfectly for:
- Development and testing
- Small personal projects
- Understanding the application logic

But when you need to **deploy to the cloud**, that's when the complexity begins...

Each AI will have its own approach to solving the deployment challenge, leading to dramatically different infrastructure complexity levels.

## The Journey Ahead

From here, the story unfolds:
- **Windsurf** will choose serverless (Lambda)
- **Claude** will scale with containers (ECS) 
- **Claude** will add enterprise features
- **Human insight** will find the simple path

All for the exact same Flask application you see here.