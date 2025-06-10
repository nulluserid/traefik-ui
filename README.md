# Traefik UI

**Version 0.6.3** - **Enterprise-Grade Network & Observability Management**

A comprehensive web interface for managing Traefik proxy configurations with advanced network topology visualization, observability integration, and enterprise-grade configuration management.

## 🚀 Key Features

### **Core Configuration Management**
- **Visual Configuration Interface**: Modern web UI for routes, services, and middleware management
- **DNS Provider Management**: Named TSIG configurations for RFC2136 DNS challenges with reusable settings
- **CrowdSec Integration**: Complete middleware management for CrowdSec bouncer plugin with AppSec support
- **Enhanced TLS Options**: HTTP vs DNS challenge selection with Let's Encrypt integration
- **Custom Certificate Support**: Upload PEM certificates with validation and automatic configuration

### **🌐 Network Management (NEW in v0.6.0)**
- **Multi-Stack Network Discovery**: Scan and connect Traefik to external Docker networks
- **Network Topology Visualization**: Interactive network maps showing container relationships
- **Smart Route Validation**: Automatic network connectivity checks during route creation
- **Cross-Stack Integration**: Enable services from external stacks to use Traefik

### **📊 Domain Overview & Health Dashboard (NEW in v0.4.0)**
- **Comprehensive Domain Analysis**: Real-time health monitoring with status indicators
- **Backend Target Analysis**: Complete routing path visualization (domain → service → container)
- **Configuration Conflict Detection**: Automatic identification of routing conflicts and orphaned services
- **Multi-tab Domain Details**: Complete configuration analysis with observability data

### **🔍 Observability & Monitoring (NEW in v0.5.0)**
- **Preset Management System**: Production, Development, Minimal, and Custom configuration modes
- **Access Logs Configuration**: JSON/CLF formatting with Graylog integration support
- **Prometheus Metrics**: Configurable endpoints with category selection and sample configs
- **OpenTelemetry Tracing**: Support for Jaeger, Zipkin, and OTLP backends with sampling control
- **One-Click Configuration**: Automatic preset deployment with real-time form updates

### **🌐 Remote Proxy Configuration (NEW in v0.6.0)**
- **IP Forwarding Management**: Configure trusted proxy IPs for real client IP detection
- **Proxy Scenario Presets**: CloudFlare, AWS ALB, nginx, HAProxy configurations with explanations
- **Rate Limiting**: IP-based rate limiting with configurable thresholds
- **Real-time Testing**: Built-in IP forwarding and proxy configuration testing

### **⚙️ Configuration Management (NEW in v0.5.1)**
- **Backup & Restore System**: Manual and automatic backups with metadata tracking
- **Version Migration**: Automatic schema migration between versions
- **Import/Export**: Configuration portability with validation
- **Template System**: Pre-configured templates for common scenarios

### **🎨 Enhanced User Experience**
- **Cyberpunk Theme**: Enhanced contrast and readability with responsive design
- **Organized Navigation**: Grouped menu system (Monitoring, Configuration, Tools)
- **Docker Label Generator**: Generate Traefik labels for docker-compose services
- **System Theme Support**: Automatic dark/light theme detection with manual toggle

## 🆕 What's New in v0.6.3

### **🌐 Remote Proxy Configuration (v0.6.0)**
- **Advanced IP Forwarding**: Comprehensive trusted proxy IP management for CloudFlare, AWS ALB, nginx, HAProxy
- **Proxy Scenario Presets**: One-click configuration with detailed explanations for common setups
- **Rate Limiting & Security**: IP-based rate limiting with configurable thresholds and burst protection
- **Real-time Testing**: Built-in IP forwarding validation and proxy configuration testing

### **🔧 Architecture & Stability (v0.6.1-0.6.3)**
- **Enhanced Notification System**: Vertical notification stacking with history management and better UX
- **Modular Architecture**: Refactored into 6 focused JavaScript modules for better maintainability
- **Comprehensive Testing**: Full testing framework with systematic coverage of all functionality
- **System Config Fixes**: Resolved backup directory and configuration loading issues
- **Semantic Versioning**: Implemented proper versioning strategy (features: +0.1.0, fixes: +0.0.1)

### **📊 Complete Feature Set**
- **Phase 1-6 Completed**: Label Generator, Service Discovery, Network Management, Domain Overview, Observability, Proxy Config
- **Enterprise-Grade Monitoring**: Full observability with Prometheus, Jaeger, and Graylog integration
- **Configuration Management**: Backup/restore, import/export, version migration, and validation
- **Network Topology**: Advanced multi-stack network visualization and management

## Quick Start

**For production deployment, use the complete deployment package:**

```bash
# Download the repository
git clone https://github.com/nulluserid/traefik-ui.git
cd traefik-ui/deploy

# Run the automated setup
./setup.sh

# Access the interfaces
# Traefik Dashboard: http://localhost:8080
# Traefik UI:        http://localhost:3000
```

**For development:**

```bash
# Install dependencies
npm install

# Configure environment variables
export TRAEFIK_CONFIG=/path/to/traefik.yml
export DYNAMIC_CONFIG=/path/to/dynamic.yml
export RESTART_COMMAND="docker restart traefik"

# Start development server
npm run dev
```

## Configuration

The UI expects Traefik to be configured with file providers for dynamic configuration:

```yaml
# traefik.yml
providers:
  file:
    filename: /path/to/dynamic.yml
    watch: true
```

## Environment Variables

- `TRAEFIK_CONFIG`: Path to main Traefik config file (default: `/etc/traefik/traefik.yml`)
- `DYNAMIC_CONFIG`: Path to dynamic config file (default: `/etc/traefik/dynamic.yml`)
- `RESTART_COMMAND`: Command to restart Traefik (default: `docker restart traefik`)
- `PORT`: Server port (default: `3000`)

### RFC2136 DNS Challenge Variables

For automatic SSL certificates via DNS challenge:

- `RFC2136_NAMESERVER`: DNS server address (e.g., `ns1.example.com:53`)
- `RFC2136_TSIG_KEY`: TSIG key name for authentication
- `RFC2136_TSIG_SECRET`: TSIG secret for authentication
- `RFC2136_TSIG_ALGORITHM`: TSIG algorithm (default: `hmac-sha256`)
- `RFC2136_TIMEOUT`: DNS update timeout (default: `60s`)
- `RFC2136_POLLING_INTERVAL`: Polling interval (default: `16s`)
- `RFC2136_PROPAGATION_TIMEOUT`: Max wait time (default: `120s`)
- `RFC2136_TTL`: DNS record TTL (default: `120`)
- `RFC2136_DNS_TIMEOUT`: DNS query timeout (default: `10s`)

## DNS Challenge Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your DNS server:**
   - Ensure your DNS server supports RFC2136 dynamic updates
   - Create a TSIG key for authentication
   - Set appropriate zone update permissions

3. **Example BIND9 configuration:**
   ```
   key "traefik-key" {
     algorithm hmac-sha256;
     secret "base64-encoded-secret-here";
   };
   
   zone "example.com" {
     type master;
     file "/etc/bind/db.example.com";
     allow-update { key "traefik-key"; };
   };
   ```

## CrowdSec Setup

1. **Enable CrowdSec service in Docker Compose:**
   ```bash
   # Edit docker-compose.yml and uncomment the crowdsec service
   ```

2. **Configure CrowdSec:**
   ```bash
   # Generate a bouncer API key
   docker exec crowdsec cscli bouncers add traefik-bouncer
   
   # Add the key to your .env file
   CROWDSEC_LAPI_KEY=your-generated-key-here
   ```

3. **TSIG Algorithm Selection:**
   ```bash
   # Choose the appropriate algorithm for your DNS server
   RFC2136_TSIG_ALGORITHM=hmac-sha256  # or hmac-md5, hmac-sha1, etc.
   ```

## Custom Certificates

1. **Certificate Chain Format:**
   - Server certificate (your domain)
   - Intermediate certificate(s) from CA
   - Root certificate (optional)
   - Must be in PEM format with -----BEGIN/END----- markers

2. **Private Key Requirements:**
   - Must match the certificate
   - PEM format without password protection
   - RSA or ECDSA keys supported

3. **Upload Process:**
   - Select "Custom Certificate" in TLS method
   - Paste certificate chain in order
   - Paste matching private key
   - Certificates are automatically stored and configured

## Templates

### Simple HTTP Service
- Basic HTTP service without TLS
- Perfect for internal development services

### HTTPS with Let's Encrypt
- Production SSL certificates via DNS challenge
- Ideal for public-facing services

### HTTPS Staging
- Test certificates from Let's Encrypt staging
- Use for testing before production

### Internal Service
- For services with self-signed certificates
- Ignores backend TLS verification errors

## API Endpoints

- `GET /api/config` - Get current configuration
- `POST /api/router` - Add new route
- `POST /api/service` - Add new service
- `DELETE /api/router/:name` - Delete route
- `POST /api/restart` - Restart Traefik
- `GET /api/dns-providers` - List DNS providers
- `POST /api/dns-providers` - Add DNS provider
- `DELETE /api/dns-providers/:name` - Delete DNS provider
- `POST /api/dns-providers/:name/test` - Test DNS provider
- `POST /api/certificate` - Upload custom certificate
- `DELETE /api/certificate/:hostname` - Delete custom certificate

## Security Considerations

This UI is designed to be simple and unauthenticated. For production use:

1. **Add authentication** (basic auth, OAuth, etc.)
2. **Restrict network access** (VPN, internal networks only)
3. **Use HTTPS** for the UI itself
4. **Validate all inputs** before writing to config files
5. **Backup configurations** before making changes