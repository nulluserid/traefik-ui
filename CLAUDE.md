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

### Phase 3: Network Management (NEXT PRIORITY)
**Goal:** Connect Traefik to external docker-compose networks for multi-stack deployments

**Implementation Plan:**
1. **External Network Discovery**
   - Scan and list all Docker networks on the system
   - Identify networks from other docker-compose stacks
   - Show network details (driver, subnet, gateway, containers)

2. **Traefik Network Management**
   - Add/remove Traefik from external networks dynamically
   - Network connection interface with validation
   - Real-time network status monitoring

3. **Cross-Stack Service Integration**
   - Enable services from external stacks to use Traefik
   - Network bridging configuration and testing
   - DNS resolution management across networks

4. **Network Configuration UI**
   - Visual network topology with connection status
   - One-click network joining/leaving
   - Network health checks and connectivity testing

**Technical Implementation:**
- New "Network Management" tab after Service Discovery
- Docker network connect/disconnect API endpoints
- Network scanning and validation functions
- Visual network topology display

### Phase 4: Network Map & Observability Dashboard (FUTURE)
**Goal:** Comprehensive network topology view with observability integration

**Implementation Plan:**
1. **Visual Network Map**
   - Interactive network topology showing domain → service → container → external host flow
   - Visual representation of routing paths and network connections
   - Real-time status indicators for each component in the chain
   - Domain-centric view with expandable service details

2. **Service Configuration Display**
   For each domain, show:
   - **TLS Configuration**: Let's Encrypt (HTTP/DNS), Custom Certificate, or None
   - **DNS Provider**: Which RFC2136 provider is used (if DNS challenge)
   - **Certificate Details**: Expiration dates, issuer, renewal status
   - **Middleware Chain**: CrowdSec, rate limiting, auth, custom middleware
   - **Backend Routing**: Target destination and configuration

3. **Backend Target Analysis**
   - **Docker Services**: Stack name, container name, internal port, network path
   - **External Services**: IP address/hostname, port, protocol
   - **Load Balancing**: Multiple backends, health checks, failover config
   - **Network Traversal**: Visual path through Docker networks

4. **OpenTelemetry Integration**
   - Configure Traefik tracing to external systems (Jaeger, Zipkin)
   - Display request traces and performance metrics
   - Service dependency mapping from trace data
   - Real-time latency and error rate monitoring

5. **Domain Health & Observability**
   - **Accessibility**: HTTP status codes, response times from traces
   - **Certificate Status**: Valid, expiring soon, expired, invalid
   - **Backend Health**: Container status, external service reachability
   - **Traffic Metrics**: Request counts, error rates, latency percentiles
   - **Trace Analysis**: Detailed request flow visualization

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

### Phase 5: Observability & Logging Configuration (FUTURE)
**Goal:** Configure and manage Traefik observability features through the UI

**Implementation Plan:**
1. **Access Logs Configuration**
   - UI to configure external Graylog integration
   - Log format selection (JSON, CLF, custom)
   - Log filtering and sampling configuration
   - Real-time log stream preview

2. **Prometheus Metrics Setup**
   - Enable/disable Prometheus metrics endpoint
   - Configure metrics collection intervals
   - Info page showing scrape endpoint and configuration
   - Sample Prometheus configuration snippets

3. **OpenTelemetry Tracing**
   - Configure tracing backends (Jaeger, Zipkin, OTLP)
   - Sampling rate configuration
   - Service name and tag management
   - Trace export format selection

4. **Logging & Metrics UI**
   - New "Observability" tab with configuration sections
   - Test connections to external systems
   - Configuration validation and preview
   - Export configuration for manual setup

**Technical Implementation:**
- Modify Traefik static configuration (traefik.yml)
- API endpoints for observability configuration
- Configuration validation and testing
- Integration with existing restart mechanism

### Phase 6: Remote Proxy Configuration (FUTURE)
**Goal:** Optimize Traefik for remote proxy scenarios with proper IP handling

**Implementation Plan:**
1. **IP Forwarding Configuration**
   - Enable real IP forwarding from external sources
   - Configure trusted proxies and IP ranges
   - X-Forwarded-For header handling
   - X-Real-IP header configuration

2. **Remote Proxy Options**
   - Checkbox options with explanations for common proxy scenarios
   - **Trust Forwarded Headers**: Accept X-Forwarded-* headers from trusted sources
   - **Preserve Host Header**: Maintain original Host header for backends
   - **External IP Detection**: Show real client IPs in logs and access
   - **Proxy Protocol**: Enable PROXY protocol for upstream connections

3. **Security & Rate Limiting**
   - Rate limiting based on real client IPs
   - IP-based access control and whitelisting
   - DDoS protection configuration
   - Secure header forwarding policies

4. **Remote Proxy UI**
   - Configuration wizard for common proxy scenarios
   - Behind CloudFlare, AWS ALB, nginx, HAProxy presets
   - Real-time IP detection testing
   - Configuration validation and testing tools

**Technical Implementation:**
- EntryPoint configuration management
- Middleware configuration for IP handling
- Trust store management for proxy IPs
- Real-time configuration testing

### Remote Proxy Configuration Examples:
**Behind CloudFlare:**
```yaml
entryPoints:
  web:
    address: ":80"
    forwardedHeaders:
      trustedIPs:
        - "173.245.48.0/20"
        - "103.21.244.0/22"
        # ... CloudFlare IP ranges
```

**Behind nginx/HAProxy:**
```yaml
entryPoints:
  web:
    address: ":80"
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
        - "192.168.0.0/16"
```

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

### Planned Endpoints (Network Management - Phase 3)
- `GET /api/docker/networks/external` - List external Docker networks available for connection
- `POST /api/docker/networks/:networkId/connect` - Connect Traefik to external network
- `DELETE /api/docker/networks/:networkId/disconnect` - Disconnect Traefik from network
- `GET /api/docker/networks/:networkId/test` - Test network connectivity and health
- `GET /api/traefik/networks` - List networks Traefik is currently connected to

### Planned Endpoints (Network Map & Observability - Phase 4)
- `GET /api/domains` - List all domains with aggregated configuration
- `GET /api/domains/:domain` - Get complete configuration for specific domain
- `GET /api/domains/:domain/health` - Get health status and metrics for domain
- `GET /api/domains/:domain/traces` - Get OpenTelemetry traces for domain
- `GET /api/domains/conflicts` - Identify routing conflicts and configuration issues
- `POST /api/domains/:domain/test` - Test domain accessibility and backend health
- `GET /api/topology` - Get complete network topology map data

### Planned Endpoints (Observability Configuration - Phase 5)
- `GET /api/observability/config` - Get current observability configuration
- `PUT /api/observability/logs` - Configure access logs and Graylog integration
- `PUT /api/observability/metrics` - Configure Prometheus metrics endpoint
- `PUT /api/observability/tracing` - Configure OpenTelemetry tracing
- `POST /api/observability/test` - Test connections to external observability systems
- `GET /api/observability/info` - Get info page data (endpoints, configs, examples)

### Planned Endpoints (Remote Proxy Configuration - Phase 6)
- `GET /api/proxy/config` - Get current proxy and IP forwarding configuration
- `PUT /api/proxy/forwarded-headers` - Configure trusted IPs and header forwarding
- `PUT /api/proxy/entrypoints` - Configure entrypoint settings for proxy scenarios
- `POST /api/proxy/test-ip` - Test real IP detection and forwarding
- `GET /api/proxy/presets` - Get predefined configurations for common proxy scenarios

## Complete Development Roadmap

### ✅ Phase 1: Label Generator (COMPLETED)
Generate Docker labels for GitOps workflows with template system and copy-to-clipboard functionality.

### ✅ Phase 2: Service Discovery (COMPLETED)  
Discover and manage Docker containers with Traefik labels, including network visualization and service management.

### 🎯 Phase 3: Network Management (NEXT PRIORITY)
**Implementation Steps:**
1. **External Network Scanner** - Detect all Docker networks on system
2. **Network Connection Manager** - Connect/disconnect Traefik to external networks
3. **Cross-Stack Integration** - Enable external services to use Traefik
4. **Network Topology UI** - Visual network management interface

### 🔮 Phase 4: Network Map & Observability (FUTURE)
**Implementation Steps:**
1. **Visual Network Topology** - Interactive domain → service → container flow
2. **OpenTelemetry Integration** - Configure tracing backends and display traces
3. **Real-time Monitoring** - Live status, metrics, and health checking
4. **Dependency Mapping** - Service relationship visualization from traces

### 🔮 Phase 5: Observability & Logging Configuration (FUTURE)
**Implementation Steps:**
1. **Graylog Integration UI** - Configure external log shipping
2. **Prometheus Setup** - Metrics endpoint configuration and info page
3. **Tracing Configuration** - OpenTelemetry backend setup
4. **Observability Dashboard** - Unified configuration management

### 🔮 Phase 6: Remote Proxy Configuration (FUTURE)
**Implementation Steps:**
1. **IP Forwarding Setup** - Configure trusted proxies and real IP detection
2. **Proxy Scenario Presets** - CloudFlare, AWS ALB, nginx, HAProxy configurations
3. **Security Configuration** - Rate limiting, access control, header policies
4. **Real-time IP Testing** - Validate IP forwarding and detection

## Key Technical Considerations

### Network Management (Phase 3)
- **Docker Network API** - Use dockerode for network connect/disconnect operations
- **Network Validation** - Ensure network compatibility and connectivity testing
- **Multi-Stack Coordination** - Handle network naming conflicts and isolation
- **Real-time Updates** - Live monitoring of network status changes

### Observability Integration (Phase 4-5)
- **OpenTelemetry Setup** - Configure Traefik tracing without restart when possible
- **Metrics Collection** - Prometheus endpoint configuration and sample configs
- **Log Stream Management** - Real-time log streaming and external system integration
- **Performance Impact** - Minimize observability overhead on Traefik performance

### Remote Proxy Optimization (Phase 6)
- **IP Trust Management** - Secure handling of forwarded IP headers
- **Configuration Validation** - Test proxy scenarios before applying
- **Security Best Practices** - Prevent IP spoofing and header injection
- **Performance Tuning** - Optimize for high-traffic proxy scenarios

## Integration Strategy
Each phase builds on previous ones:
- **Phase 3** uses Service Discovery to manage network connections
- **Phase 4** uses Network Management data for topology visualization  
- **Phase 5** enhances Phase 4 with rich observability data
- **Phase 6** provides the foundation for production proxy deployments

This creates a comprehensive Traefik management platform suitable for everything from development to large-scale production deployments.