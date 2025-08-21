# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flask web application for generating QR codes with customizable styling and variants. Uses qrserver.com API and serves a single-page interface with embedded HTML/CSS/JavaScript.

## Development Commands

### Local Development

```bash
# Source utility functions from util/functions
source util/functions
start_local
```

### Docker Development

```bash
source util/functions
docker_up  # Build and run
stop_docker
```

### Direct Commands

```bash
# Local
python3 -m venv venv
source venv/bin/activate  
pip install -r service/requirements.txt
python service/app.py

# Docker  
cd service && docker build -t service . && docker run -p 8080:8080 service
```

## Architecture & Preferences

- **Language**: Prefer Python for all development tasks where possible
- **Structure**: Single Flask app (`service/app.py`) with embedded frontend
- **Utilities**: Bash functions in `util/functions` for common development tasks
- **Port**: Application runs on port 8080

## Key Files

- `service/app.py` - Main Flask application
- `service/requirements.txt` - Python dependencies  
- `util/functions` - Bash utility functions for development