# Traefik UI - Claude Development Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Traefik UI project.

**IMPORTANT NOTE:** All development and testing is done on the remote server at root@10.0.1.125 under /opt/traefik-ui/. Local development server is NOT used. Always deploy changes to the remote server for testing via git pull.

## Project Overview
**Version:** 0.6.3  
**Type:** Enterprise-grade web interface for Traefik reverse proxy with network topology visualization, observability management, and remote proxy configuration  
**Tech Stack:** Node.js (Express), Vanilla JavaScript, CSS3, Docker, dockerode

## Version Management Policy (Updated 2025-06-10)
**NEW SEMANTIC VERSIONING STRATEGY:**
- **Bug Fixes & Minor Updates:** +0.0.1 (e.g., 0.6.2 → 0.6.3)
- **Phases & Feature Additions:** +0.1.0 (e.g., 0.6.0 → 0.7.0)
- **Major Architecture Changes:** +1.0.0 (future major releases)

**Current Version Breakdown:**
- **v0.6.3** = 6 completed phases + 3 bug fix cycles
- **Phase Count:** 6 phases completed (Label Generator through Remote Proxy Config)
- **Bug Fix Count:** 3 iterations (notification system, system config, modular architecture)
- **Next Phase:** v0.7.0 (future feature development)
- **Next Bug Fix:** v0.6.4 (if needed)

## Repository Management Protocol (Added 2025-06-10)
**IMPORTANT:** Always perform full repository cleanup before starting next phase:

### **Pre-Phase Cleanup Checklist:**
1. ✅ **Repository Cleanup** - Remove temporary files, organize structure
2. ✅ **Documentation Update** - Update README, version references, feature lists
3. ✅ **Version Synchronization** - Update all package.json files and version constants
4. ✅ **Comprehensive Commit** - Detailed commit message with all changes
5. ✅ **GitHub Push** - Push all changes to master branch
6. ✅ **GitHub Release** - Create tagged release with detailed notes: `gh release create vX.Y.Z --title "..." --generate-notes`
7. ✅ **Remote Deployment** - Pull and deploy to development server: `ssh root@10.0.1.125 "cd /opt/traefik-ui && git pull origin master"`
8. ✅ **Functionality Verification** - Test core functionality and API endpoints

### **GitHub Release Commands:**
```bash
# Create release with auto-generated notes
gh release create v0.6.3 --title "v0.6.3 - Enterprise-Grade Network & Observability Management" --generate-notes

# For major releases, add detailed custom notes
gh release create v0.7.0 --title "v0.7.0 - Phase 7: [Feature Name]" --notes-file RELEASE_NOTES.md
```  

### Core Purpose
Eliminates manual editing of Traefik configuration files by providing a visual web interface for:
- Route and service management with intelligent network validation
- Docker service discovery and container label management
- **Network management for multi-stack deployments** (NEW in v0.0.5)
- DNS provider configuration (RFC2136/TSIG)
- CrowdSec middleware integration
- Docker label generation for GitOps workflows
- TLS certificate management (Let's Encrypt + custom certs)
- **Organized navigation with grouped menu system** (NEW in v0.0.5)

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

**IMPORTANT NOTE:** All development and testing is done on the remote server at root@10.0.1.125 under /opt/traefik-ui/. Local development server is NOT used. Always deploy changes to the remote server for testing via git pull.

### Remote Deployment Process
```bash
# SSH to remote server
ssh root@10.0.1.125

# Navigate to installation directory
cd /opt/traefik-ui

# Pull latest changes from Git
git pull origin master

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
- **`/api/docker/services`** - Docker container discovery and label management (NEW in v0.0.5)
- **`/api/docker/networks`** - Docker network discovery and topology (NEW in v0.0.5)
- **`/api/networks/management`** - Network management with Traefik connection status (NEW in v0.0.5)
- **`/api/networks/:id/connect`** - Connect Traefik to external networks (NEW in v0.0.5)
- **`/api/networks/:id/disconnect`** - Disconnect Traefik from networks (NEW in v0.0.5)
- **`/api/networks/topology`** - Network topology visualization data (NEW in v0.0.5)

**DNS Provider System**:
- JSON-based persistent storage in `dns-providers.json`
- Named TSIG configurations for reusability across routes
- Validation for RFC2136 parameters and TSIG algorithms

### Frontend Architecture (Vanilla JavaScript)
**Modular Architecture** (ENHANCED in v0.0.7):
- **`js/traefik-ui.js`** - Main orchestrator class with initialization and tab management
- **`js/utils.js`** - Shared utilities (API requests, notifications, validation, helpers)
- **`js/ui-components.js`** - Reusable UI components (modals, tables, forms, cards)
- **`js/core-config.js`** - Route/service/DNS/TLS/middleware management
- **`js/network-manager.js`** - Docker service discovery and network operations
- **`js/observability.js`** - Domain monitoring, health checks, and observability configuration
- **`js/proxy-config.js`** - Remote proxy scenarios, IP forwarding, and security settings (NEW in v0.0.7)
- Event-driven architecture with DOM manipulation
- No frameworks - pure JavaScript with fetch API
- **Organized modular design for maintainability and future expansion**

**Theme System**:
- **Enhanced cyberpunk theme with improved contrast** (UPDATED in v0.0.5)
- CSS custom properties for dual light/dark themes
- Automatic system preference detection with manual override
- LocalStorage persistence for user preference
- **Reduced glow effects for better text readability** (UPDATED in v0.0.5)

**Grouped Navigation Interface** (ENHANCED in v0.0.6):
**📊 Monitoring Group:**
- Overview: Current routes/services display with health status
- **Domain Overview: Comprehensive health dashboard with topology mapping** (NEW in v0.0.6)
- **Service Discovery: Docker container scanning and management** (NEW in v0.0.5)
- **Network Management: Multi-stack network connectivity** (NEW in v0.0.5)

**⚙️ Configuration Group:**
- Add Route: Form-based route creation with **intelligent network validation** (NEW in v0.0.5)
- Middleware: CrowdSec configuration management
- DNS Providers: TSIG/RFC2136 configuration management
- **Proxy Config: Remote proxy scenarios with IP forwarding and security** (NEW in v0.0.7)
- **Observability: Complete logging, metrics, and tracing management with presets** (NEW in v0.0.6)

**🛠️ Tools Group:**
- Label Generator: Docker label generation for GitOps
- Templates: Quick-start templates for common scenarios
- **System Config: Backup, restore, import/export with version migration** (NEW in v0.0.6)

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
- Current version 0.0.6 with comprehensive observability and network management
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

## Version Management System

**🔄 Configuration Schema Versioning:**
Comprehensive version tracking and automatic migration system for backward compatibility.

**Current Schema Version:** `0.0.6`
**Supported Versions:** `0.0.5`, `0.0.6`

**Version Stamps in Configuration:**
```yaml
traefik_ui:
  version: "0.0.6"                    # UI version
  config_schema_version: "0.0.6"     # Schema version (for migrations)
  backup:
    ui_version: "0.0.6"
    config_schema_version: "0.0.6"
    backup_from_version: "0.0.5"     # Original version (if migrated)
    migration_applied: true           # If migration was applied
    migrated_from: "0.0.5"           # Source version
    migrated_at: "2025-06-10T..."     # Migration timestamp
```

**🛠️ Automatic Migration System:**
- **Load-time migration:** Configurations are automatically migrated when loaded
- **Import/restore migration:** Old backups/imports are migrated before application
- **Backup preservation:** Original version information is preserved
- **Sequential migrations:** Support for multi-step migrations (v0.0.5 → v0.0.6 → v0.0.7)

**📝 Migration Guidelines for Future Versions:**
1. **Increment CURRENT_CONFIG_VERSION** when schema changes
2. **Add new version to SUPPORTED_CONFIG_VERSIONS** array
3. **Create migration function** (e.g., `migrateFrom_0_0_6_to_0_0_7`)
4. **Update default configuration** with new fields
5. **Test migration with old configuration files**

**🔍 Migration Functions:**
- `migrateConfigToCurrentVersion()` - Main migration coordinator
- `migrateFrom_0_0_5_to_0_0_6()` - v0.0.5 → v0.0.6 migration
- `ensureConfigCompleteness()` - Fills missing fields with defaults

## Current Features Status (v0.0.6)

### ✅ Completed Features
1. **Visual Configuration Management** - Web interface for routes/services with intelligent validation
2. **Docker Service Discovery** - Scan and manage containers with Traefik labels (NEW in v0.0.5)
3. **Network Management** - Connect Traefik to external docker-compose networks (NEW in v0.0.5)
4. **Domain Overview & Health Dashboard** - Comprehensive domain analysis with topology mapping (NEW in v0.0.6)
5. **Observability Configuration** - Complete logging, metrics, and tracing management with presets (NEW in v0.0.6)
6. **DNS Provider Management** - RFC2136/TSIG configurations with reusable settings
7. **CrowdSec Integration** - Complete middleware management with AppSec support
8. **TLS Management** - Let's Encrypt (HTTP/DNS) + custom certificate support
9. **Configuration Management System** - Backup, restore, import/export with version migration (NEW in v0.0.6)
10. **Enhanced Cyberpunk Theme** - Improved contrast and readability (UPDATED in v0.0.5)
11. **Organized Navigation** - Grouped menu system with logical organization (NEW in v0.0.5)
12. **Docker Label Generator** - Generate Traefik labels for docker-compose services
13. **Template System** - Quick-start templates for common scenarios

### ⚠️ Known Issues (v0.0.5)
1. **Network Attachability Bug** - Networks showing "not attachable" when they should be connectable
2. **Primary Network Disconnect Bug** - "deploy_traefik" network shows conflicting disconnect options (says both "cannot disconnect" and shows disconnect button)
3. **Service Discovery Filtering** - Service filtering dropdown needs implementation
4. **Scan vs Refresh Distinction** - Need to differentiate scan and refresh functionality

### 🚀 Major Addition: Network Management (v0.0.5)
Complete network management system enabling multi-stack Docker deployments:

**Key Features:**
- **Network Discovery**: Scan all Docker networks with Traefik connection status
- **Smart Connection Management**: Connect/disconnect Traefik to external networks
- **Network Topology Visualization**: Interactive network maps showing container relationships
- **Intelligent Route Validation**: Automatic network connectivity checks during route creation
- **Cross-Stack Integration**: Enable services from external stacks to use Traefik

**Implementation Details:**
- New "Network Management" tab in Monitoring group
- Docker API integration using dockerode library
- `/api/networks/management` endpoint for network discovery with Traefik status
- `/api/networks/:id/connect` and `/api/networks/:id/disconnect` for network management
- Smart modal dialogs offering to connect required networks during route creation
- Real-time network status monitoring and filtering

### 🎨 Enhanced User Experience (v0.0.5)
**Contrast & Readability Improvements:**
- Fixed light blue buttons with white text issues
- Dark purple/red/pink gradients with crisp white text for all badges
- Reduced excessive glow effects (5px → 2px for tabs, 10px → 3px for headings)
- Enhanced notification contrast with gradient backgrounds

**Navigation & Organization:**
- Grouped menu system: Monitoring, Configuration, Tools
- Responsive design with mobile-friendly layouts
- Smart button differentiation (Scan vs Refresh functionality)
- Enhanced service filtering with proper status-based filtering

## Development Roadmap

### Phase 1: Label Generator ✅ COMPLETED
- [x] Docker label generation from form inputs
- [x] Template system for common scenarios  
- [x] Copy-to-clipboard functionality
- [x] Integration with existing DNS/middleware systems

### Phase 2: Service Discovery ✅ COMPLETED  
- [x] Docker daemon integration via dockerode
- [x] Container scanning for existing Traefik labels
- [x] Service management interface with filtering
- [x] Network discovery and display
- [x] Label parsing and validation
- [x] Real-time service status monitoring

### Phase 3: Network Management ✅ COMPLETED
- [x] External network discovery and scanning
- [x] Traefik network connection management (connect/disconnect)
- [x] Cross-stack service integration
- [x] Visual network topology with connection status
- [x] Network health checks and connectivity testing
- [x] Intelligent route validation with network connectivity checks
- [x] Smart modal dialogs for automatic network connection

**Technical Achievements:**
- Complete Docker API integration using dockerode
- Network connect/disconnect API endpoints (`/api/networks/:id/connect`, `/api/networks/:id/disconnect`)
- Network topology visualization (`/api/networks/topology`)
- Smart route validation with automatic network connectivity offers
- Real-time network status monitoring and filtering

### Phase 4: Network Map & Observability Dashboard ✅ COMPLETED
**Goal:** Comprehensive network topology view with observability integration

**Implementation Results:**
1. **Visual Network Map** ✅
   - Interactive network topology showing domain → service → container → external host flow
   - Visual representation of routing paths and network connections
   - Real-time status indicators for each component in the chain
   - Domain-centric view with expandable service details

2. **Service Configuration Display** ✅
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

4. **OpenTelemetry Integration** (🌐 Reference: https://doc.traefik.io/traefik/observability/tracing/overview/)
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

This overview dashboard provides operations teams with a single pane of glass for understanding the complete routing topology and identifying potential issues before they become problems.

### 🎉 Major Achievements in v0.0.6

#### Phase 4: Network Map & Observability Dashboard ✅ COMPLETED
**Revolutionary domain analysis and network topology visualization:**
- **Domain Overview Dashboard**: Comprehensive health analysis with real-time status indicators
- **Interactive Network Topology**: Visual mapping of domain → service → container → network paths  
- **Advanced Health Monitoring**: Container inspection, network connectivity analysis, and backend validation
- **OpenTelemetry Integration**: Mock trace data ready for Jaeger/Zipkin backends
- **Multi-tab Domain Details**: Complete configuration analysis with observability data
- **Conflict Detection**: Automatic identification of routing conflicts and orphaned services

#### Phase 5: Observability & Logging Configuration ✅ COMPLETED  
**Enterprise-grade observability management with preset system:**
- **Preset Management**: Production, Development, Minimal, and Custom configuration modes
- **Access Logs**: JSON/CLF formatting with Graylog integration support
- **Prometheus Metrics**: Configurable endpoints with category selection and sample configs
- **OpenTelemetry Tracing**: Support for Jaeger, Zipkin, and OTLP backends with sampling control
- **One-Click Application**: Automatic preset deployment with real-time form updates
- **Configuration Testing**: Built-in testing tools for all observability endpoints
- **Enhanced UI**: Status indicators, conditional sections, and responsive design

#### Phase 5.5: Configuration Management System ✅ COMPLETED
**Comprehensive backup, migration, and configuration management:**
- **Version Migration**: Automatic schema migration from v0.0.5 to v0.0.6
- **Backup & Restore**: Manual and automatic backups with metadata tracking  
- **Import/Export**: Configuration portability with validation
- **UI Configuration**: Centralized management of presets, templates, and settings
- **Validation System**: Real-time configuration validation with detailed error reporting

## Development Roadmap

### Phase 1: Label Generator ✅ COMPLETED
- [x] Docker label generation from form inputs
- [x] Template system for common scenarios  
- [x] Copy-to-clipboard functionality
- [x] Integration with existing DNS/middleware systems

### Phase 2: Service Discovery ✅ COMPLETED  
- [x] Docker daemon integration via dockerode
- [x] Container scanning for existing Traefik labels
- [x] Service management interface with filtering
- [x] Network discovery and display
- [x] Label parsing and validation
- [x] Real-time service status monitoring

### Phase 3: Network Management ✅ COMPLETED
- [x] External network discovery and scanning
- [x] Traefik network connection management (connect/disconnect)
- [x] Cross-stack service integration
- [x] Visual network topology with connection status
- [x] Network health checks and connectivity testing
- [x] Intelligent route validation with network connectivity checks
- [x] Smart modal dialogs for automatic network connection

**Technical Achievements:**
- Complete Docker API integration using dockerode
- Network connect/disconnect API endpoints (`/api/networks/:id/connect`, `/api/networks/:id/disconnect`)
- Network topology visualization (`/api/networks/topology`)
- Smart route validation with automatic network connectivity offers
- Real-time network status monitoring and filtering

### Phase 4: Network Map & Observability Dashboard ✅ COMPLETED
**Goal:** Comprehensive network topology view with observability integration

**Implementation Results:**
1. **Visual Network Map** ✅
   - Interactive network topology showing domain → service → container → external host flow
   - Visual representation of routing paths and network connections
   - Real-time status indicators for each component in the chain
   - Domain-centric view with expandable service details

2. **Service Configuration Display** ✅
   For each domain, show:
   - **TLS Configuration**: Let's Encrypt (HTTP/DNS), Custom Certificate, or None
   - **DNS Provider**: Which RFC2136 provider is used (if DNS challenge)
   - **Certificate Details**: Expiration dates, issuer, renewal status
   - **Middleware Chain**: CrowdSec, rate limiting, auth, custom middleware
   - **Backend Routing**: Target destination and configuration

3. **Backend Target Analysis** ✅
   - **Docker Services**: Stack name, container name, internal port, network path
   - **External Services**: IP address/hostname, port, protocol
   - **Load Balancing**: Multiple backends, health checks, failover config
   - **Network Traversal**: Visual path through Docker networks

4. **OpenTelemetry Integration** ✅
   - Mock implementation ready for Jaeger/Zipkin integration
   - Display request traces and performance metrics structure
   - Service dependency mapping framework
   - Real-time latency and error rate monitoring architecture

5. **Domain Health & Observability** ✅
   - **Accessibility**: HTTP status codes, response times
   - **Certificate Status**: Valid, expiring soon, expired, invalid detection
   - **Backend Health**: Container status, external service reachability
   - **Traffic Metrics**: Request counts, error rates, latency percentiles
   - **Conflict Detection**: Automatic identification of routing conflicts

### Phase 5: Observability & Logging Configuration ✅ COMPLETED
**Goal:** Configure and manage Traefik observability features through the UI

**Implementation Results:**
1. **Access Logs Configuration** ✅
   - UI to configure external Graylog integration (configurable endpoint/format)
   - Log format selection (JSON, CLF, custom)
   - Log filtering and sampling configuration
   - Real-time log stream preview

2. **Prometheus Metrics Setup** ✅
   - Enable/disable Prometheus metrics endpoint
   - Configure metrics collection intervals
   - Info page showing scrape endpoint and configuration
   - Sample Prometheus configuration snippets

3. **OpenTelemetry Tracing** ✅
   - Configure tracing backends (Jaeger, Zipkin, OTLP)
   - Sampling rate configuration
   - Service name and tag management
   - Trace export format selection

4. **Preset Management System** ✅ (NEW FEATURE)
   - **Production Preset**: JSON logs + full metrics + Jaeger tracing (10% sampling)
   - **Development Preset**: CLF logs + basic metrics + no tracing
   - **Minimal Preset**: All observability disabled for minimal overhead
   - **Custom Mode**: Manual configuration using detailed forms

5. **Enhanced Observability UI** ✅
   - One-click preset application with automatic form updates
   - Real-time status indicators for all observability components
   - Comprehensive testing tools for each configuration type
   - Parallel configuration application for better performance

**Technical Implementation:**
- Modified Traefik static configuration (traefik.yml) management
- Complete API endpoints for observability configuration
- Configuration validation and testing infrastructure
- Integration with existing restart mechanism and UI configuration system

### Phase 6: Remote Proxy Configuration ✅ COMPLETED
**Revolutionary proxy configuration system for production deployments behind external proxies:**

**🌐 Proxy Scenario Presets:**
- **CloudFlare**: Complete CloudFlare IP ranges with CF-Connecting-IP header support
- **AWS ALB**: VPC subnet trust with X-Forwarded-For handling
- **nginx**: X-Real-IP and custom proxy range configuration
- **HAProxy**: PROXY protocol support with load balancer integration
- **Custom**: Manual configuration for specific proxy setups

**🔍 IP Forwarding & Trust Management:**
- Trusted proxy IP range configuration (CIDR notation support)
- Multiple header support (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- Header depth configuration for multi-hop proxies
- Insecure mode for development environments
- Real-time IP detection and validation testing

**⚡ Security & Rate Limiting:**
- IP-based rate limiting with configurable average/burst rates
- Source IP extraction from forwarded headers
- Rate limiting based on real client IPs (not proxy IPs)
- Configuration validation with security warnings
- Export/import functionality for configuration management

**🛠️ Advanced Features:**
- Real-time IP forwarding test endpoint
- Configuration validation with detailed error reporting
- Automatic preset application with one-click setup
- Integration with existing Traefik static/dynamic configuration
- Comprehensive documentation and explanations for each preset

**Technical Implementation:**
- Complete API endpoint suite (`/api/proxy/*`)
- Static configuration (traefik.yml) entryPoints management
- Dynamic middleware generation for rate limiting
- IP/CIDR validation with IPv4/IPv6 support
- Real-time configuration testing and validation

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

### Implemented Endpoints (Service Discovery - Phase 2) ✅
- `GET /api/docker/services` - List all containers with Traefik labels
- `GET /api/docker/networks` - List Docker networks and Traefik connectivity
- `PUT /api/docker/labels/:containerId` - Update container labels
- `GET /api/docker/status/:containerId` - Get service health and status

### Implemented Endpoints (Network Management - Phase 3) ✅
- `GET /api/networks/management` - Get network information with Traefik connection status
- `POST /api/networks/:networkId/connect` - Connect Traefik to external network
- `POST /api/networks/:networkId/disconnect` - Disconnect Traefik from network
- `GET /api/networks/topology` - Get detailed network topology

### Implemented Endpoints (Network Map & Observability - Phase 4) ✅
- `GET /api/domains` - List all domains with aggregated configuration
- `GET /api/domains/:domain` - Get complete configuration for specific domain
- `GET /api/domains/:domain/health` - Get health status and metrics for domain
- `GET /api/domains/:domain/traces` - Get OpenTelemetry traces for domain
- `GET /api/domains/conflicts` - Identify routing conflicts and configuration issues
- `POST /api/domains/:domain/test` - Test domain accessibility and backend health
- `GET /api/domains/topology` - Get complete network topology map data
- `GET /api/domains/metrics` - Get performance metrics for all domains

### Implemented Endpoints (Observability Configuration - Phase 5) ✅
- `GET /api/observability/config` - Get current observability configuration
- `PUT /api/observability/logs` - Configure access logs and Graylog integration
- `PUT /api/observability/metrics` - Configure Prometheus metrics endpoint
- `PUT /api/observability/tracing` - Configure OpenTelemetry tracing
- `POST /api/observability/test` - Test connections to external observability systems

### Implemented Endpoints (Configuration Management - Phase 5.5) ✅
- `GET /api/config/ui` - Get full UI configuration with presets
- `PUT /api/config/ui` - Update UI configuration
- `POST /api/config/ui/backup` - Create manual backup
- `GET /api/config/ui/backups` - List available backups
- `GET /api/config/ui/backups/:filename/download` - Download specific backup
- `DELETE /api/config/ui/backups/:filename` - Delete specific backup
- `POST /api/config/ui/restore` - Restore from backup
- `GET /api/config/ui/export` - Export configuration for download
- `POST /api/config/ui/import` - Import configuration from upload
- `POST /api/config/ui/validate` - Validate configuration without saving

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

### ✅ Phase 3: Network Management (COMPLETED)
**Implementation Steps:**
1. ✅ **External Network Scanner** - Detect all Docker networks on system with Traefik connection status
2. ✅ **Network Connection Manager** - Connect/disconnect Traefik to external networks with validation
3. ✅ **Cross-Stack Integration** - Enable external services to use Traefik through network management
4. ✅ **Network Topology UI** - Visual network management interface with container relationships
5. ✅ **Smart Route Validation** - Automatic network connectivity checks during route creation

### 🎯 Phase 4: Network Map & Observability (NEXT - HIGH PRIORITY)
**Implementation Steps:**
1. **Visual Network Topology** - Interactive domain → service → container flow
2. **OpenTelemetry Integration** - Configure tracing backends and display traces (Reference: https://doc.traefik.io/traefik/observability/tracing/overview/)
3. **Real-time Monitoring** - Live status, metrics, and health checking
4. **Dependency Mapping** - Service relationship visualization from traces

### 🎯 Phase 5: Observability & Logging Configuration (HIGH PRIORITY)
**Implementation Steps:**
1. **Graylog Integration UI** - Configure external log shipping (configurable endpoint/format)
2. **Prometheus Setup** - Metrics endpoint configuration and info page
3. **Tracing Configuration** - OpenTelemetry backend setup
4. **Observability Dashboard** - Unified configuration management

### 🎯 Phase 6: Remote Proxy Configuration (HIGH PRIORITY)
**Implementation Steps:**
1. **IP Forwarding Setup** - Configure trusted proxies and real IP detection
2. **External IP Passing** - Ensure real client IPs reach containers (like nginx behavior)
3. **Proxy Scenario Presets** - CloudFlare, AWS ALB, nginx, HAProxy configurations with explanations
4. **Security Configuration** - Rate limiting, access control, header policies
5. **Real-time IP Testing** - Validate IP forwarding and detection

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