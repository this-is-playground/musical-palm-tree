# QR Generator Service Evolution

This repository contains two complete versions of the QR Generator service, showing the evolution from direct AWS infrastructure management to component-based architecture.

## Project Versions

### 1. `windsurf-infrastructure/` - Direct Infrastructure Approach
- **141 lines** of direct AWS resource management
- Full VPC configuration, security groups, and networking setup
- Lambda function deployed in VPC with Redis access
- Complete manual control over all AWS resources

**Structure:**
```
windsurf-infrastructure/
├── infrastructure/     # Direct AWS infrastructure (141 lines)
├── service/           # Flask application
├── util/              # Development utilities
└── CLAUDE.md          # Project guidance
```

### 2. `final/` - Component-Based Approach  
- **16-19 lines** of infrastructure code
- Reusable Pulumi components (KeyValueStore + ComputeService)
- Two deployment options: YAML or TypeScript
- Eliminates all duplication and complexity

**Structure:**
```
final/
├── components/        # Reusable Pulumi components
├── infrastructure/    # Simple deployment (YAML + TypeScript examples)
├── service/          # Flask application  
├── util/             # Development utilities
└── CLAUDE.md         # Project guidance
```

## Key Differences

| Aspect | windsurf-infrastructure | final |
|--------|------------------------|-------|
| **Lines of Code** | 141 lines | 16-19 lines |
| **Approach** | Direct AWS resources | Reusable components |
| **Complexity** | High (manual networking) | Low (sensible defaults) |
| **Maintenance** | High duplication | Single source of truth |
| **Flexibility** | Full control | Good defaults, customizable |

## Evolution Benefits

The component-based approach provides:
- **87% reduction** in infrastructure code
- **Reusable components** across projects
- **No duplication** between infrastructure setups
- **Multiple deployment options** (YAML/TypeScript)
- **Easier maintenance** and updates

Each folder is a complete, self-contained version of the project that can be deployed independently.