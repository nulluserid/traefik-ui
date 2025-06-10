# Traefik UI

**Version 0.0.1**

A simple web interface for managing Traefik proxy configurations without manually editing config files.

## Features

- **Visual Configuration Management**: View current routes and services in a clean interface
- **Guided Templates**: Pre-configured templates for common scenarios (HTTP, HTTPS with Let's Encrypt, internal services)
- **Form-Based Route Creation**: Easy forms to add new proxy routes with validation
- **TLS Configuration**: Support for Let's Encrypt and custom certificates
- **Service Management**: Automatically create backend services when adding routes
- **Restart Integration**: Restart Traefik directly from the UI

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   export TRAEFIK_CONFIG=/path/to/traefik.yml
   export DYNAMIC_CONFIG=/path/to/dynamic.yml
   export RESTART_COMMAND="docker restart traefik"
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
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

## Security Considerations

This UI is designed to be simple and unauthenticated. For production use:

1. **Add authentication** (basic auth, OAuth, etc.)
2. **Restrict network access** (VPN, internal networks only)
3. **Use HTTPS** for the UI itself
4. **Validate all inputs** before writing to config files
5. **Backup configurations** before making changes