# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flask web application for generating QR codes with customizable styling and variants. This version uses **ECS Fargate containers** with production-grade monitoring and auto-scaling.

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

### Infrastructure Deployment

```bash
cd infrastructure
npm install
pulumi up
```

## Architecture & Preferences

- **Language**: Prefer Python for all development tasks where possible
- **Structure**: Single Flask app (`service/app.py`) with embedded frontend
- **Infrastructure**: ECS Fargate with Application Load Balancer, auto-scaling, and monitoring
- **Deployment**: Container-based with ECR registry
- **Utilities**: Bash functions in `util/functions` for common development tasks
- **Port**: Application runs on port 8080

## Key Files

- `service/app.py` - Main Flask application
- `service/requirements.txt` - Python dependencies
- `service/Dockerfile` - Container definition  
- `infrastructure/index.ts` - ECS infrastructure with ALB and monitoring (412 lines)
- `util/functions` - Bash utility functions for development

## Infrastructure Features

- ECS Fargate cluster with auto-scaling (1-3 tasks dev, 2-10 prod)
- Application Load Balancer with health checks
- ECR repository with lifecycle policies
- CloudWatch dashboard with ECS and ALB metrics
- Private subnets with NAT gateway for container security