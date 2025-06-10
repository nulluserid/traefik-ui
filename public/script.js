class TraefikUI {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConfig();
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('refresh-btn').addEventListener('click', () => this.loadConfig());
        document.getElementById('route-form').addEventListener('submit', (e) => this.handleRouteSubmit(e));
        document.getElementById('enable-tls').addEventListener('change', (e) => this.toggleTLSOptions(e.target.checked));
        document.getElementById('restart-traefik').addEventListener('click', () => this.restartTraefik());

        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => this.useTemplate(card.dataset.template));
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    toggleTLSOptions(enabled) {
        const tlsOptions = document.getElementById('tls-options');
        if (enabled) {
            tlsOptions.classList.remove('hidden');
        } else {
            tlsOptions.classList.add('hidden');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.displayRoutes(config.dynamic.http?.routers || {});
            this.displayServices(config.dynamic.http?.services || {});
        } catch (error) {
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    displayRoutes(routers) {
        const container = document.getElementById('routes-list');
        
        if (Object.keys(routers).length === 0) {
            container.innerHTML = '<p>No routes configured</p>';
            return;
        }

        container.innerHTML = Object.entries(routers).map(([name, config]) => `
            <div class="route-item">
                <div class="route-header">
                    <div>
                        <div class="route-name">${name}</div>
                        <div class="route-rule">${config.rule}</div>
                        <div>Service: ${config.service}${config.tls ? '<span class="route-tls">TLS</span>' : ''}</div>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="ui.deleteRoute('${name}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    displayServices(services) {
        const container = document.getElementById('services-list');
        
        if (Object.keys(services).length === 0) {
            container.innerHTML = '<p>No services configured</p>';
            return;
        }

        container.innerHTML = Object.entries(services).map(([name, config]) => {
            const servers = config.loadBalancer?.servers || [];
            const urls = servers.map(s => s.url).join(', ');
            
            return `
                <div class="service-item">
                    <div class="service-header">
                        <div>
                            <div class="service-name">${name}</div>
                            <div class="service-url">${urls}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleRouteSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const routeName = document.getElementById('route-name').value;
        const hostname = document.getElementById('hostname').value;
        const backendUrl = document.getElementById('backend-url').value;
        const enableTls = document.getElementById('enable-tls').checked;
        const tlsMethod = document.getElementById('tls-method').value;
        const ignoreTlsErrors = document.getElementById('ignore-tls-errors').checked;

        const serviceName = `${routeName}-service`;
        
        try {
            await this.createService(serviceName, backendUrl, { ignoreTlsErrors });
            
            const routeConfig = {
                name: routeName,
                rule: `Host(\`${hostname}\`)`,
                service: serviceName,
                tls: enableTls ? (tlsMethod === 'letsencrypt' ? { certResolver: 'letsencrypt' } : {}) : null
            };

            await this.createRoute(routeConfig);
            
            this.showNotification('Route created successfully!', 'success');
            document.getElementById('route-form').reset();
            this.loadConfig();
            
        } catch (error) {
            this.showNotification('Failed to create route', 'error');
        }
    }

    async createService(name, url, options = {}) {
        const serviceConfig = { name, url };
        
        if (options.ignoreTlsErrors) {
            serviceConfig.options = {
                serversTransport: 'insecureTransport'
            };
        }

        const response = await fetch('/api/service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceConfig)
        });

        if (!response.ok) {
            throw new Error('Failed to create service');
        }
    }

    async createRoute(config) {
        const response = await fetch('/api/router', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            throw new Error('Failed to create route');
        }
    }

    async deleteRoute(name) {
        if (!confirm(`Are you sure you want to delete route "${name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/router/${name}`, { method: 'DELETE' });
            
            if (response.ok) {
                this.showNotification('Route deleted successfully!', 'success');
                this.loadConfig();
            } else {
                throw new Error('Failed to delete route');
            }
        } catch (error) {
            this.showNotification('Failed to delete route', 'error');
        }
    }

    async restartTraefik() {
        if (!confirm('Are you sure you want to restart Traefik? This may cause temporary downtime.')) {
            return;
        }

        try {
            const response = await fetch('/api/restart', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Traefik restarted successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Failed to restart Traefik', 'error');
        }
    }

    useTemplate(templateName) {
        this.switchTab('add-route');
        
        const templates = {
            'simple-http': {
                routeName: 'my-app',
                hostname: 'app.example.com',
                backendUrl: 'http://192.168.1.100:8080',
                enableTls: false
            },
            'https-letsencrypt': {
                routeName: 'my-secure-app',
                hostname: 'secure.example.com',
                backendUrl: 'http://192.168.1.100:8080',
                enableTls: true,
                tlsMethod: 'letsencrypt'
            },
            'https-staging': {
                routeName: 'test-app',
                hostname: 'test.example.com',
                backendUrl: 'http://192.168.1.100:8080',
                enableTls: true,
                tlsMethod: 'letsencrypt-staging'
            },
            'internal-service': {
                routeName: 'internal-app',
                hostname: 'internal.example.com',
                backendUrl: 'https://192.168.1.100:8443',
                enableTls: true,
                ignoreTlsErrors: true,
                tlsMethod: 'letsencrypt'
            }
        };

        const template = templates[templateName];
        if (template) {
            document.getElementById('route-name').value = template.routeName || '';
            document.getElementById('hostname').value = template.hostname || '';
            document.getElementById('backend-url').value = template.backendUrl || '';
            document.getElementById('enable-tls').checked = template.enableTls || false;
            document.getElementById('ignore-tls-errors').checked = template.ignoreTlsErrors || false;
            
            if (template.tlsMethod) {
                document.getElementById('tls-method').value = template.tlsMethod;
            }
            
            this.toggleTLSOptions(template.enableTls || false);
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

const ui = new TraefikUI();