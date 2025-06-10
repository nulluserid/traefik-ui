# Traefik UI - Claude Development Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Traefik UI project.

## Project Overview
**Version:** 0.0.3  
**Type:** Web-based configuration management interface for Traefik reverse proxy  
**Tech Stack:** Node.js (Express), Vanilla JavaScript, CSS3, Docker  

### Core Purpose
Eliminates manual editing of Traefik configuration files by providing a visual web interface for:
- Route and service management
- DNS provider configuration (RFC2136/TSIG)
- CrowdSec middleware integration
- **Docker label generation for GitOps workflows** (NEW in v0.0.3)
- TLS certificate management (Let's Encrypt + custom certs)

## Development Commands

### Local Development
- `npm install` - Install dependencies
- `npm start` - Start production server (port 3000)
- `npm run dev` - Start development server with auto-reload (nodemon)

### Remote Testing Server
- **Server:** root@10.0.1.125
- **Installation Path:** /opt/traefik-ui/
- **Deployment Method:** Git pull from GitHub repository
- **Test URLs:** 
  - Traefik UI: http://10.0.1.125:3000
  - Traefik Dashboard: http://10.0.1.125:8080

### Remote Deployment Process
```bash
# SSH to remote server
ssh root@10.0.1.125

# Navigate to installation directory
cd /opt/traefik-ui

# Pull latest changes from Git
git pull origin main

# Restart containers to apply changes
docker compose down && docker compose up -d --build
```

### Docker Deployment
- `./deploy/setup.sh` - One-click deployment with automated Docker setup
- `docker compose up -d --build` - Build and start containers
- `docker compose down` - Stop and remove containers
- `docker compose logs -f` - View container logs

### Testing Deployment
- `curl http://localhost:3000/api/config` - Test API endpoints (local)
- `curl http://10.0.1.125:3000/api/config` - Test API endpoints (remote)
- `curl http://10.0.1.125:8080` - Test Traefik dashboard (remote)
- Test UI functionality by accessing http://10.0.1.125:3000

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
- **Label Generator: Docker label generation for GitOps** (NEW in v0.0.3)
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

## Current Features Status (v0.0.3)

### ✅ Completed Features
1. **Visual Configuration Management** - Web interface for routes/services
2. **DNS Provider Management** - RFC2136/TSIG configurations with reusable settings
3. **CrowdSec Integration** - Complete middleware management with AppSec support
4. **TLS Management** - Let's Encrypt (HTTP/DNS) + custom certificate support
5. **Theme System** - Auto dark/light mode with manual toggle
6. **Template System** - Quick-start templates for common scenarios
7. **Docker Label Generator** - NEW: Generate Traefik labels for docker-compose services

### 🔄 Recent Addition: Label Generator
The Label Generator (added in v0.0.3) bridges file-based configuration with Docker label-based service discovery:

**Key Features:**
- Form-based Docker label generation
- Integration with existing DNS providers and middleware
- Copy-to-clipboard functionality with visual feedback  
- Template system for common scenarios (Simple Web App, API Service, Protected Service, Development Service)
- Complete docker-compose.yml example generation

**Implementation Details:**
- New tab between DNS Providers and Templates
- `buildTraefikLabels()` method generates proper Docker labels with escaping
- Dynamic form fields based on TLS method selection
- Template system with `useLabelTemplate()` method

## Development Roadmap

### Phase 1: Label Generator ✅ COMPLETED
- [x] Docker label generation from form inputs
- [x] Template system for common scenarios  
- [x] Copy-to-clipboard functionality
- [x] Integration with existing DNS/middleware systems

### Phase 2: Service Discovery (NEXT PRIORITY)
**Goal:** Discover and manage services that already have Traefik labels

**Implementation Plan:**
1. **Docker Integration**
   - Connect to Docker daemon via socket/API (`/var/run/docker.sock`)
   - Scan running containers for existing Traefik labels
   - Parse and display discovered service configurations

2. **Service Management Interface**
   - New "Service Discovery" tab after Label Generator
   - List all label-based services vs file-based routes
   - Show service health, status, and current label configuration
   - Enable/disable services without modifying labels

3. **Label Editing Capabilities**
   - In-place editing of existing Docker labels
   - Validation against current Traefik configuration
   - Update container labels without container recreation
   - Sync changes back to docker-compose files if needed

4. **Network Discovery**
   - Detect which networks Traefik is connected to
   - Show service network connectivity and routing paths
   - Identify external networks that need Traefik access

**Technical Implementation:**
- Add Docker API client (`dockerode` or direct HTTP API calls)
- New `/api/docker/services` endpoint for container discovery
- Label parsing and validation functions
- Live container status monitoring

### Phase 3: Network Management (FUTURE)
**Goal:** Multi-stack network management for distributed deployments

**Implementation Plan:**
1. **Network Topology View**
   - Visual representation of Docker networks and connections
   - Show which services are on which networks
   - Identify network isolation and connectivity issues

2. **Cross-Stack Communication**
   - Add/remove services from Traefik networks dynamically
   - Network bridging configuration for multi-stack setups
   - DNS resolution management across networks

3. **Advanced Routing**
   - Cross-network service discovery and routing
   - Load balancing across multiple docker-compose stacks
   - Network-aware middleware and service policies

### Phase 4: Domain Overview Dashboard (FUTURE)
**Goal:** Comprehensive domain-centric view of all routing and service configurations

**Implementation Plan:**
1. **Domain-Centric Dashboard**
   - Master view organized by domain names (e.g., app.example.com, api.mysite.org)
   - Unified display of all services using each domain
   - Quick identification of routing conflicts and configuration issues

2. **Service Configuration Display**
   For each domain, show:
   - **TLS Configuration**: Let's Encrypt (HTTP/DNS), Custom Certificate, or None
   - **DNS Provider**: Which RFC2136 provider is used (if DNS challenge)
   - **Certificate Details**: Expiration dates, issuer, renewal status
   - **Middleware Chain**: CrowdSec, rate limiting, auth, custom middleware
   - **Backend Routing**: Target destination and configuration

3. **Backend Target Analysis**
   - **Docker Services**: Stack name, container name, internal port, network
   - **External Services**: IP address/hostname, port, protocol
   - **Load Balancing**: Multiple backends, health checks, failover config
   - **Network Path**: Which Docker networks are traversed

4. **Domain Health & Status**
   - **Accessibility**: HTTP status codes, response times
   - **Certificate Status**: Valid, expiring soon, expired, invalid
   - **Backend Health**: Container status, external service reachability
   - **Traffic Metrics**: Request counts, error rates (if available)

5. **Configuration Source Tracking**
   - **File-based**: Routes defined via Traefik UI in dynamic.yml
   - **Label-based**: Services discovered via Docker labels
   - **Mixed**: Services using both configuration methods
   - **Conflicts**: Multiple routes claiming same domain

**Technical Implementation:**
- New "Domain Overview" tab as primary dashboard
- Aggregate data from file-based config, Docker labels, and live status
- Cross-reference DNS providers, certificates, and middleware
- Real-time health checking for domains and backends
- Visual indicators for configuration issues and conflicts

**UI Design Concepts:**
- **Domain Cards**: Each domain gets a expandable card showing full config
- **Status Indicators**: Color-coded health status (green/yellow/red)
- **Configuration Trees**: Hierarchical view of routing path
- **Quick Actions**: Direct links to edit DNS, certificates, or routing

**Example Domain Card Display:**
```
🌐 app.example.com                           [🟢 Healthy]
├── 🔒 TLS: Let's Encrypt DNS (primary-dns)  [Valid until: 2025-08-15]
├── 🛡️  Middleware: crowdsec-bouncer
├── 📍 Backend: Docker → my-stack/web-app:3000 (traefik network)
└── ⚡ Status: 200ms response, 99.9% uptime

🌐 api.mysite.org                            [🟡 Warning]
├── 🔒 TLS: Custom Certificate               [⚠️ Expires in 7 days]
├── 🛡️  Middleware: rate-limit, cors
├── 📍 Backend: External → 192.168.1.50:8080
└── ⚡ Status: 150ms response, 3 errors today
```

This overview dashboard will provide operations teams with a single pane of glass for understanding the complete routing topology and identifying potential issues before they become problems.

## API Endpoint Reference

### Current Endpoints
- `GET /api/config` - Get current Traefik configuration
- `POST /api/router` - Create new route  
- `DELETE /api/router/:name` - Delete route
- `POST /api/service` - Create backend service
- `POST /api/restart` - Restart Traefik service
- `GET /api/dns-providers` - List DNS providers
- `POST /api/dns-providers` - Add DNS provider
- `DELETE /api/dns-providers/:name` - Remove DNS provider  
- `POST /api/dns-providers/:name/test` - Test DNS provider
- `GET /api/middleware` - Get middleware configurations
- `POST /api/middleware/crowdsec` - Create CrowdSec middleware
- `DELETE /api/middleware/:name` - Remove middleware
- `POST /api/certificate` - Upload custom certificate
- `DELETE /api/certificate/:hostname` - Remove certificate

### Planned Endpoints (Service Discovery - Phase 2)
- `GET /api/docker/services` - List all containers with Traefik labels
- `GET /api/docker/networks` - List Docker networks and Traefik connectivity
- `PUT /api/docker/labels/:containerId` - Update container labels
- `POST /api/docker/network/:service` - Add service to Traefik network
- `GET /api/docker/status/:service` - Get service health and status

### Planned Endpoints (Domain Overview - Phase 4)
- `GET /api/domains` - List all domains with aggregated configuration
- `GET /api/domains/:domain` - Get complete configuration for specific domain
- `GET /api/domains/:domain/health` - Get health status and metrics for domain
- `GET /api/domains/:domain/certificates` - Get certificate details and expiration
- `GET /api/domains/conflicts` - Identify routing conflicts and configuration issues
- `POST /api/domains/:domain/test` - Test domain accessibility and backend health

## Development Notes for Service Discovery

### Next Implementation Steps
1. **Add Docker API Integration** - Install `dockerode` or use native Docker HTTP API
2. **Create Service Discovery Tab** - New tab between Label Generator and Templates  
3. **Implement Container Scanning** - Read all containers and parse Traefik labels
4. **Build Service Management UI** - Show discovered services with edit capabilities
5. **Add Label Editing** - Form-based editing of existing container labels

### Key Technical Considerations
- **Docker Socket Access** - Ensure container has `/var/run/docker.sock` mounted
- **Label Parsing** - Handle complex label values and escaping correctly
- **Real-time Updates** - Consider WebSocket or polling for live container status
- **Error Handling** - Graceful handling of Docker daemon connectivity issues

### Integration with Existing Systems
- Reuse DNS provider dropdown population logic
- Integrate with existing middleware system for label-based services
- Maintain consistency with current form validation patterns
- Use existing notification system for user feedback

The Service Discovery implementation will complete the GitOps workflow: Label Generator helps create labels, Service Discovery helps manage existing labeled services.