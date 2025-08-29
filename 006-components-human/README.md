# Final Component-Based Version

This is the **final version** showing the QR Generator service using **Pulumi components** for clean, reusable infrastructure.

## Key Features

- Component-based architecture (KeyValueStore + ComputeService)
- Two deployment options: YAML (19 lines) or TypeScript (16 lines)
- Reusable components with sensible defaults
- Eliminates all infrastructure duplication

## Structure

```
components/
├── key-value-store/     # Redis component
├── compute-service/     # Lambda component
infrastructure/
├── Pulumi.yaml         # YAML approach (primary)
├── index.ts           # TypeScript approach (example)
service/
├── app.py             # Flask application
```

## Deployment Options

### Option 1: YAML (Recommended)
```bash
cd infrastructure
pulumi up
```

### Option 2: TypeScript
```bash
cd infrastructure  
npm install
pulumi up --config runtime=nodejs
```

## Benefits

- **Simple**: 19 lines YAML vs 141 lines direct infrastructure
- **Reusable**: Components can be used across projects
- **Maintainable**: Single source of truth for each component
- **Flexible**: Easy to customize with component properties

## Original Description

Flask web app for generating QR codes with customizable styling and batch generation.
