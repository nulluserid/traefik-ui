# Traefik UI - Deployment

**One-Click Deployment for Traefik UI v0.0.3**

This folder contains everything needed to deploy Traefik UI in a production or development environment.

## Quick Start

```bash
# Download this folder (or clone the repo and navigate to deploy/)
cd traefik-ui-deploy/

# Run the setup script
./setup.sh

# Access the interfaces
# Traefik Dashboard: http://localhost:8080
# Traefik UI:        http://localhost:3000
```

## What the Setup Script Does

1. ✅ **Prerequisites Check**: Verifies Docker and Docker Compose are installed
2. 📁 **Directory Setup**: Creates `certs/`, `data/`, and `logs/` directories
3. ⚙️ **Environment Config**: Copies `.env.example` to `.env` if needed
4. 📧 **Email Configuration**: Prompts for Let's Encrypt email address
5. 🏗️ **Build & Deploy**: Builds the Docker containers and starts the stack
6. 📊 **Access Info**: Shows URLs and next steps

## File Structure

```
deploy/
├── setup.sh              # One-click setup script
├── docker-compose.yml    # Docker services definition
├── .env.example          # Environment variables template
├── app/                  # Traefik UI source code
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── public/
├── config/               # Traefik configuration templates
│   ├── traefik.yml       # Static configuration
│   └── dynamic.yml       # Dynamic configuration
└── README.md            # This file
```

## Configuration

### Environment Variables (.env)

Copy `.env.example` to `.env` and configure:

```bash
# RFC2136 DNS Challenge (for automatic SSL)
RFC2136_NAMESERVER=ns1.example.com:53
RFC2136_TSIG_KEY=your-key
RFC2136_TSIG_SECRET=your-secret
RFC2136_TSIG_ALGORITHM=hmac-sha256

# CrowdSec (optional security)
CROWDSEC_LAPI_KEY=your-crowdsec-key
CROWDSEC_MODE=stream
```

### Email Configuration

Update the email in `config/traefik.yml` for Let's Encrypt:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com  # Change this!
```

## Features Included

- 🔒 **SSL/TLS**: Let's Encrypt automatic certificates + custom certificate upload
- 🛡️ **Security**: CrowdSec integration for threat protection
- 🎨 **UI**: Dark/light theme with system preference detection
- ⚙️ **Management**: Web interface for routes, services, and middleware
- 📊 **Monitoring**: Traefik dashboard for traffic monitoring

## Management Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update and rebuild
git pull && docker compose up -d --build

# View running containers
docker compose ps
```

## Production Considerations

1. **Security**: Add authentication to the UI (not included by default)
2. **SSL**: Configure proper SSL certificates for the UI itself
3. **Network**: Restrict access to internal networks only
4. **Backup**: Backup the `config/` and `data/` directories
5. **Updates**: Regularly update Traefik and the UI

## Customization

### Adding Custom Routes

1. Access the Traefik UI at `http://localhost:3000`
2. Go to "Add Route" tab
3. Fill in hostname, backend URL, and TLS settings
4. Optionally enable CrowdSec protection

### DNS Challenge Setup

1. Configure your DNS server to accept RFC2136 updates
2. Create TSIG keys for authentication
3. Update `.env` with your DNS server details
4. Restart the stack: `docker compose restart`

### CrowdSec Setup

1. Uncomment the CrowdSec service in `docker-compose.yml`
2. Generate a bouncer key: `docker exec crowdsec cscli bouncers add traefik-bouncer`
3. Add the key to your `.env` file
4. Create CrowdSec middleware via the UI

## Troubleshooting

### Traefik Won't Start
- Check logs: `docker compose logs traefik`
- Verify configuration syntax: `docker exec traefik traefik --configfile=/traefik.yml --dry-run`

### UI Not Accessible
- Check if container is running: `docker compose ps`
- View UI logs: `docker compose logs traefik-ui`

### SSL Issues
- Verify DNS challenge configuration in `.env`
- Check Let's Encrypt rate limits
- Use staging environment first: select "Let's Encrypt (Staging)" in UI

### Port Conflicts
- Ensure ports 80, 443, 3000, and 8080 are available
- Modify ports in `docker-compose.yml` if needed

## Support

- 📖 **Documentation**: [Main Repository](https://github.com/nulluserid/traefik-ui)
- 🐛 **Issues**: [GitHub Issues](https://github.com/nulluserid/traefik-ui/issues)
- 📝 **Changelog**: [CHANGELOG.md](https://github.com/nulluserid/traefik-ui/blob/master/CHANGELOG.md)

## License

This project is open source. See the main repository for license details.