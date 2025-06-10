#!/bin/bash

# Traefik UI Setup Script
# Version 0.0.3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}
╔══════════════════════════════════════╗
║         Traefik UI Setup             ║
║         Version 0.0.3                ║
╚══════════════════════════════════════╝${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "Prerequisites check passed ✓"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p certs data logs
    
    # Set permissions
    chmod 755 certs data logs
    
    print_status "Directories created ✓"
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_status "Setting up environment configuration..."
        cp .env.example .env
        print_warning "Environment file (.env) created from template."
        print_warning "Please edit .env file to configure your DNS and CrowdSec settings."
    else
        print_status "Environment file already exists ✓"
    fi
}

# Prompt for basic configuration
configure_basic_settings() {
    print_status "Basic configuration setup..."
    
    # Check if .env needs basic configuration
    if grep -q "admin@example.com" config/traefik.yml; then
        echo
        read -p "Enter your email for Let's Encrypt certificates: " email
        if [ ! -z "$email" ]; then
            sed -i.bak "s/admin@example.com/$email/g" config/traefik.yml
            rm -f config/traefik.yml.bak
            print_status "Email configured in Traefik config ✓"
        fi
    fi
}

# Build and start the stack
start_stack() {
    print_status "Building and starting Traefik UI stack..."
    
    # Use docker compose or docker-compose based on availability
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    # Build and start
    $DOCKER_COMPOSE up -d --build
    
    print_status "Stack started successfully ✓"
}

# Show access information
show_access_info() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════╗"
    echo -e "║         Setup Complete! 🎉           ║"
    echo -e "╚══════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  📊 Traefik Dashboard: http://localhost:8080"
    echo "  🖥️  Traefik UI:       http://localhost:3000"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Configure your DNS settings in .env file"
    echo "  2. Set up CrowdSec if needed (see README.md)"
    echo "  3. Create your first route via the web interface"
    echo
    echo -e "${BLUE}Configuration Files:${NC}"
    echo "  📄 Environment: .env"
    echo "  ⚙️  Traefik Static: config/traefik.yml"
    echo "  🔄 Traefik Dynamic: config/dynamic.yml"
    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  📈 View logs:    $DOCKER_COMPOSE logs -f"
    echo "  🔄 Restart:      $DOCKER_COMPOSE restart"
    echo "  🛑 Stop:         $DOCKER_COMPOSE down"
    echo "  ♻️  Update:       git pull && $DOCKER_COMPOSE up -d --build"
    echo
    echo -e "${YELLOW}⚠️  Important:${NC}"
    echo "  • Update email in config/traefik.yml for Let's Encrypt"
    echo "  • Configure DNS settings in .env for automatic certificates"
    echo "  • Review security settings before production use"
    echo
}

# Check if running as root (warn if so)
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. Consider using a non-root user for better security."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Main setup function
main() {
    print_header
    
    check_root
    check_prerequisites
    create_directories
    setup_environment
    configure_basic_settings
    start_stack
    show_access_info
}

# Run main function
main "$@"