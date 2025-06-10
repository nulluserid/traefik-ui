# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- `npm install` - Install dependencies
- `npm start` - Start production server (port 3000)
- `npm run dev` - Start development server with auto-reload (nodemon)

### Docker Deployment
- `./deploy/setup.sh` - One-click deployment with automated Docker setup
- `docker compose up -d --build` - Build and start containers
- `docker compose down` - Stop and remove containers
- `docker compose logs -f` - View container logs

### Testing Deployment
- `curl http://localhost:3000/api/config` - Test API endpoints
- `curl http://localhost:8080` - Test Traefik dashboard
- Test UI functionality by accessing http://localhost:3000

## Project Architecture

### Dual Structure
This project has both a standalone version (root directory) and a complete deployment package (deploy/ directory). The deployment package is the primary distribution method.

**Root Directory**: Legacy standalone version
- `server.js`, `public/`, `package.json` - Basic Node.js application
- Direct Traefik integration requiring manual configuration

**Deploy Directory**: Complete containerized solution
- `deploy/app/` - Full application source (identical functionality)
- `deploy/config/` - Traefik configuration templates
- `deploy/docker-compose.yml` - Multi-service orchestration
- `deploy/setup.sh` - Automated deployment script

### Backend Architecture (Node.js/Express)
**Core Configuration Management**:
- YAML file manipulation using `js-yaml` library
- Two-tier config system: static (`traefik.yml`) and dynamic (`dynamic.yml`)
- Environment variable-based path configuration via `TRAEFIK_CONFIG` and `DYNAMIC_CONFIG`

**API Structure**:
- `/api/config` - Read current Traefik configuration
- `/api/router` - CRUD operations for HTTP routes
- `/api/service` - Backend service management
- `/api/middleware/crowdsec` - CrowdSec middleware configuration
- `/api/certificate` - Custom certificate upload/management
- `/api/dns-providers` - DNS provider/TSIG configuration management
- `/api/restart` - Traefik service restart via child process execution

**DNS Provider System**:
- JSON-based persistent storage in `dns-providers.json`
- Named TSIG configurations for reusability across routes
- Validation for RFC2136 parameters and TSIG algorithms

### Frontend Architecture (Vanilla JavaScript)
**Single-Class Design**:
- `TraefikUI` class handles all functionality
- Event-driven architecture with DOM manipulation
- No frameworks - pure JavaScript with fetch API

**Theme System**:
- CSS custom properties for dual light/dark themes
- Automatic system preference detection with manual override
- LocalStorage persistence for user preference

**Tab-Based Interface**:
- Overview: Current routes/services display
- Add Route: Form-based route creation with TLS options
- Middleware: CrowdSec configuration management
- DNS Providers: TSIG/RFC2136 configuration management
- Templates: Quick-start templates for common scenarios

### TLS and Certificate Management
**Three-Tier TLS System**:
1. **HTTP Challenge**: Standard Let's Encrypt without DNS requirements
2. **DNS Challenge**: Let's Encrypt with RFC2136 dynamic DNS (requires DNS provider)
3. **Custom Certificates**: User-uploaded PEM certificates with private keys

**DNS Challenge Integration**:
- Named DNS provider configurations stored independently
- Dynamic form fields based on challenge type selection
- TSIG algorithm support: HMAC-MD5, SHA1, SHA224, SHA256, SHA384, SHA512

### Traefik Integration
**File Provider Architecture**:
- Static configuration in `traefik.yml` (plugins, entrypoints, certificate resolvers)
- Dynamic configuration in `dynamic.yml` (routes, services, middleware, TLS)
- File watching enabled for real-time configuration updates

**CrowdSec Plugin Integration**:
- Experimental plugin configuration in static config
- Dynamic middleware creation through UI
- Support for stream/live/alone modes and AppSec features

## Key Environment Variables

### Application Configuration
- `PORT` - Server port (default: 3000)
- `TRAEFIK_CONFIG` - Path to traefik.yml (default: /etc/traefik/traefik.yml)
- `DYNAMIC_CONFIG` - Path to dynamic.yml (default: /etc/traefik/dynamic.yml)
- `RESTART_COMMAND` - Command to restart Traefik (default: docker restart traefik)

### RFC2136 DNS Challenge (Global Fallback)
- `RFC2136_NAMESERVER` - DNS server address with port
- `RFC2136_TSIG_KEY` - TSIG key name
- `RFC2136_TSIG_SECRET` - Base64 encoded TSIG secret
- `RFC2136_TSIG_ALGORITHM` - Algorithm (hmac-sha256, etc.)

### CrowdSec Configuration
- `CROWDSEC_LAPI_URL` - CrowdSec Local API URL
- `CROWDSEC_LAPI_KEY` - API key for CrowdSec integration
- `CROWDSEC_MODE` - Operation mode (stream/live/alone/none)

## File System Expectations

### Certificate Storage
- `./certs/` - Custom certificate storage directory
- Files named as `{hostname}.crt` and `{hostname}.key`
- Docker volume mount required for container access

### Configuration Persistence
- DNS providers stored in `dns-providers.json` in application directory
- Configuration files must be writable by application user
- Backup recommended before configuration changes

## Development Notes

### Version Strategy
- Current version 0.0.3 with comprehensive DNS provider management
- Deployment-focused architecture ready for Docker Hub publishing
- Maintains backward compatibility with standalone deployment

### Security Model
- Designed for internal/trusted network deployment
- No authentication system - add external auth for production
- File system access required for configuration management
- Docker socket access needed for Traefik restarts

### Configuration Validation
- YAML syntax validation before writing configuration files
- DNS provider configuration validation with test endpoints
- Certificate format validation for custom uploads
- Form validation prevents invalid route creation