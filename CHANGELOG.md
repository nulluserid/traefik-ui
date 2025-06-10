# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2025-06-09

### Added
- **CrowdSec Integration**: Complete support for CrowdSec bouncer plugin
  - Middleware management interface for creating and configuring CrowdSec protection
  - Support for all CrowdSec modes: stream, live, alone, none
  - AppSec (WAF) configuration options
  - Trusted IPs configuration for bypassing protection
  - LAPI key and URL configuration
- **System Theme Support**: Automatic dark/light theme detection and manual toggle
  - Follows browser/system preference automatically
  - Manual theme toggle button in header
  - Persistent theme selection stored in localStorage
  - Smooth transitions between themes
- **Enhanced TSIG Support**: Extended RFC2136 DNS challenge configuration
  - Support for multiple TSIG algorithms: hmac-md5, hmac-sha1, hmac-sha224, hmac-sha256, hmac-sha384, hmac-sha512
  - Improved environment variable documentation
- **Middleware Integration**: Route creation now supports middleware assignment
  - Checkbox to enable CrowdSec protection for new routes
  - Dynamic middleware selection from available configured middleware
  - Multi-select support for applying multiple middleware to routes

### Enhanced
- **UI/UX Improvements**: Complete visual overhaul with CSS custom properties
  - Dark theme with carefully chosen colors for optimal readability
  - Light theme refined for better contrast and accessibility
  - Header controls reorganized with theme toggle
  - Middleware management tab added to main navigation
- **Template System**: Removed separate protected service template in favor of integrated middleware options
- **Configuration Management**: Better organization of CrowdSec and DNS challenge settings

### Technical Details
- Traefik static configuration updated to include CrowdSec plugin support
- New API endpoints for middleware CRUD operations
- Enhanced Docker Compose with CrowdSec service template
- Environment variable expansion for all configuration options
- CSS custom properties for consistent theming across all components

## [0.0.1] - 2025-06-09

### Added
- Initial release of Traefik UI
- Web-based interface for managing Traefik configurations
- Docker Compose deployment with automatic container building
- Support for RFC2136 DNS challenge for Let's Encrypt certificates
- Template system for common proxy configurations:
  - Simple HTTP service
  - HTTPS with Let's Encrypt (Production)
  - HTTPS with Let's Encrypt (Staging)
  - Internal service with TLS error bypass
- Configuration file management (traefik.yml and dynamic.yml)
- Route and service creation through web forms
- Visual configuration viewer showing current routes and services
- Traefik service restart capability from UI
- Environment variable configuration for DNS challenge
- Health checks and auto-restart policies
- Comprehensive documentation and setup guides

### Features
- **Web Interface**: Clean, responsive UI with tabbed navigation
- **Template-Based Configuration**: Pre-built templates for common scenarios
- **Let's Encrypt Integration**: Support for both production and staging certificates
- **DNS Challenge Support**: RFC2136 integration for automatic certificate generation
- **Docker Integration**: Containerized deployment with Docker Compose
- **Configuration Management**: Real-time reading and writing of Traefik config files
- **Service Management**: Create routes and backend services through forms
- **Visual Feedback**: Status notifications and configuration display

### Technical Details
- Built with Node.js/Express backend
- Vanilla JavaScript frontend (no frameworks)
- Docker containerization with multi-stage builds
- YAML configuration file parsing with js-yaml
- Health monitoring and automatic restarts
- Non-root container execution for security
- Environment-based configuration

[0.0.1]: https://github.com/yourusername/traefik-ui/releases/tag/v0.0.1