# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flask web application for generating QR codes with customizable styling and variants. This is the **base version** with no cloud infrastructure - just the pure application.

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
docker_up  # Build and run Flask + Redis
stop_docker
```

### Direct Commands

```bash
# Local Python development
python3 -m venv venv
source venv/bin/activate  
pip install -r service/requirements.txt
python service/app.py

# Docker
docker-compose up
```

## Architecture & Preferences

- **Language**: Prefer Python for all development tasks where possible
- **Structure**: Single Flask app (`service/app.py`) with embedded frontend
- **Infrastructure**: None - local development only
- **Storage**: Local Redis via Docker Compose
- **Utilities**: Bash functions in `util/functions` for common development tasks
- **Port**: Application runs on port 8080

## Key Files

- `service/app.py` - Main Flask application
- `service/requirements.txt` - Python dependencies
- `service/Dockerfile` - Container definition
- `docker-compose.yml` - Local development stack (Flask + Redis)
- `util/functions` - Bash utility functions for development

## Local Features

- QR code generation with multiple styling variants
- Usage statistics tracking (stored in Redis)
- Responsive single-page web interface
- Docker containerization for consistent development environment

This version represents the starting point before any cloud deployment complexity is introduced.