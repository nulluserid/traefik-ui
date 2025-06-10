class TraefikUI {
    constructor() {
        this.init();
        this.initTheme();
    }

    init() {
        this.setupEventListeners();
        this.loadConfig();
        this.loadMiddleware();
        this.loadDNSProviders();
    }

    initTheme() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadConfig());
        document.getElementById('route-form').addEventListener('submit', (e) => this.handleRouteSubmit(e));
        document.getElementById('crowdsec-form').addEventListener('submit', (e) => this.handleCrowdSecSubmit(e));
        document.getElementById('dns-provider-form').addEventListener('submit', (e) => this.handleDNSProviderSubmit(e));
        document.getElementById('enable-tls').addEventListener('change', (e) => this.toggleTLSOptions(e.target.checked));
        document.getElementById('tls-method').addEventListener('change', (e) => this.handleTLSMethodChange(e.target.value));
        document.getElementById('enable-crowdsec').addEventListener('change', (e) => this.toggleMiddlewareOptions(e.target.checked));
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

    handleTLSMethodChange(tlsMethod) {
        const customCertOptions = document.getElementById('custom-cert-options');
        const dnsProviderOptions = document.getElementById('dns-provider-options');
        
        // Show custom certificate options
        if (tlsMethod === 'custom') {
            customCertOptions.classList.remove('hidden');
        } else {
            customCertOptions.classList.add('hidden');
        }
        
        // Show DNS provider selection for DNS challenges
        if (tlsMethod === 'letsencrypt-dns' || tlsMethod === 'letsencrypt-staging-dns') {
            dnsProviderOptions.classList.remove('hidden');
        } else {
            dnsProviderOptions.classList.add('hidden');
        }
    }

    toggleMiddlewareOptions(enabled) {
        const middlewareOptions = document.getElementById('middleware-options');
        if (enabled) {
            middlewareOptions.classList.remove('hidden');
            this.populateMiddlewareSelect();
        } else {
            middlewareOptions.classList.add('hidden');
        }
    }

    async populateMiddlewareSelect() {
        try {
            const response = await fetch('/api/middleware');
            const data = await response.json();
            
            const select = document.getElementById('middleware-select');
            select.innerHTML = '';
            
            Object.keys(data.middlewares).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load middleware options:', error);
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
        const dnsProvider = document.getElementById('dns-provider').value;
        const ignoreTlsErrors = document.getElementById('ignore-tls-errors').checked;
        const enableCrowdSec = document.getElementById('enable-crowdsec').checked;
        const certChain = document.getElementById('cert-chain').value;
        const privateKey = document.getElementById('private-key').value;

        const serviceName = `${routeName}-service`;
        
        try {
            await this.createService(serviceName, backendUrl, { ignoreTlsErrors });
            
            const routeConfig = {
                name: routeName,
                rule: `Host(\`${hostname}\`)`,
                service: serviceName,
                tls: enableTls ? this.buildTlsConfig(tlsMethod, dnsProvider, certChain, privateKey, hostname) : null
            };

            // Add middleware if selected
            if (enableCrowdSec) {
                const middlewareSelect = document.getElementById('middleware-select');
                const selectedMiddleware = Array.from(middlewareSelect.selectedOptions).map(option => option.value);
                if (selectedMiddleware.length > 0) {
                    routeConfig.middleware = selectedMiddleware;
                }
            }

            // Handle custom certificate if needed
            if (enableTls && tlsMethod === 'custom') {
                await this.storeCertificate(hostname, certChain, privateKey);
            }

            await this.createRoute(routeConfig);
            
            this.showNotification('Route created successfully!', 'success');
            document.getElementById('route-form').reset();
            this.loadConfig();
            
        } catch (error) {
            this.showNotification('Failed to create route', 'error');
        }
    }

    buildTlsConfig(tlsMethod, dnsProvider, certChain, privateKey, hostname) {
        switch (tlsMethod) {
            case 'letsencrypt-http':
                return { certResolver: 'letsencrypt-http' };
            case 'letsencrypt-dns':
                if (!dnsProvider) {
                    throw new Error('DNS provider is required for DNS challenges');
                }
                return { 
                    certResolver: 'letsencrypt-dns',
                    dnsProvider: dnsProvider
                };
            case 'letsencrypt-staging-http':
                return { certResolver: 'letsencrypt-staging-http' };
            case 'letsencrypt-staging-dns':
                if (!dnsProvider) {
                    throw new Error('DNS provider is required for DNS challenges');
                }
                return { 
                    certResolver: 'letsencrypt-staging-dns',
                    dnsProvider: dnsProvider
                };
            case 'custom':
                if (!certChain || !privateKey) {
                    throw new Error('Certificate chain and private key are required for custom certificates');
                }
                return { 
                    domains: [{ main: hostname }],
                    options: 'default'
                };
            default:
                return {};
        }
    }

    async storeCertificate(hostname, certChain, privateKey) {
        const certData = {
            hostname,
            certChain: certChain.trim(),
            privateKey: privateKey.trim()
        };

        const response = await fetch('/api/certificate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(certData)
        });

        if (!response.ok) {
            throw new Error('Failed to store certificate');
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

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    async loadMiddleware() {
        try {
            const response = await fetch('/api/middleware');
            const data = await response.json();
            
            this.displayMiddleware(data.middlewares);
        } catch (error) {
            this.showNotification('Failed to load middleware', 'error');
        }
    }

    displayMiddleware(middlewares) {
        const container = document.getElementById('middleware-list');
        
        if (Object.keys(middlewares).length === 0) {
            container.innerHTML = '<p>No middleware configured</p>';
            return;
        }

        container.innerHTML = Object.entries(middlewares).map(([name, config]) => {
            const isCrowdSec = config.plugin && config.plugin['crowdsec-bouncer-traefik-plugin'];
            const crowdSecConfig = isCrowdSec ? config.plugin['crowdsec-bouncer-traefik-plugin'] : null;
            
            return `
                <div class="middleware-item">
                    <div class="middleware-header">
                        <div>
                            <span class="middleware-name">${name}</span>
                            ${isCrowdSec ? '<span class="middleware-type">CrowdSec</span>' : ''}
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="ui.deleteMiddleware('${name}')">Delete</button>
                    </div>
                    ${isCrowdSec ? `
                        <div class="middleware-config">Mode: ${crowdSecConfig.crowdsecMode || 'stream'}</div>
                        <div class="middleware-config">AppSec: ${crowdSecConfig.crowdsecAppsecEnabled ? 'Enabled' : 'Disabled'}</div>
                        <div class="middleware-config">LAPI URL: ${crowdSecConfig.crowdsecLapiUrl || 'Not configured'}</div>
                    ` : `
                        <div class="middleware-config">Type: ${Object.keys(config)[0]}</div>
                    `}
                </div>
            `;
        }).join('');
    }

    async handleCrowdSecSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('middleware-name').value;
        const enabled = document.getElementById('middleware-enabled').checked;
        const mode = document.getElementById('crowdsec-mode').value;
        const lapiUrl = document.getElementById('lapi-url').value;
        const lapiKey = document.getElementById('lapi-key').value;
        const appsecEnabled = document.getElementById('appsec-enabled').checked;
        const trustedIPs = document.getElementById('trusted-ips').value
            .split(',')
            .map(ip => ip.trim())
            .filter(ip => ip);

        try {
            const response = await fetch('/api/middleware/crowdsec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    enabled,
                    mode,
                    lapiUrl,
                    lapiKey,
                    appsecEnabled,
                    trustedIPs
                })
            });

            if (response.ok) {
                this.showNotification('CrowdSec middleware created successfully!', 'success');
                document.getElementById('crowdsec-form').reset();
                this.loadMiddleware();
            } else {
                throw new Error('Failed to create middleware');
            }
        } catch (error) {
            this.showNotification('Failed to create CrowdSec middleware', 'error');
        }
    }

    async deleteMiddleware(name) {
        if (!confirm(`Are you sure you want to delete middleware "${name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/middleware/${name}`, { method: 'DELETE' });
            
            if (response.ok) {
                this.showNotification('Middleware deleted successfully!', 'success');
                this.loadMiddleware();
            } else {
                throw new Error('Failed to delete middleware');
            }
        } catch (error) {
            this.showNotification('Failed to delete middleware', 'error');
        }
    }

    // DNS Provider Management
    async loadDNSProviders() {
        try {
            const response = await fetch('/api/dns-providers');
            const providers = await response.json();
            this.displayDNSProviders(providers);
            this.populateDNSProviderDropdown(providers);
        } catch (error) {
            console.error('Failed to load DNS providers:', error);
            document.getElementById('dns-providers-list').innerHTML = '<p>Failed to load DNS providers</p>';
        }
    }

    displayDNSProviders(providers) {
        const container = document.getElementById('dns-providers-list');
        
        if (providers.length === 0) {
            container.innerHTML = '<p>No DNS providers configured. Add one below to enable DNS challenges.</p>';
            return;
        }

        container.innerHTML = providers.map(provider => `
            <div class="dns-provider-card">
                <div class="dns-provider-header">
                    <span class="dns-provider-name">${provider.name}</span>
                    <span class="dns-provider-type">${provider.type.toUpperCase()}</span>
                </div>
                <div class="dns-provider-details">
                    <div class="detail-row">
                        <span>Server:</span>
                        <span>${provider.config.nameserver}</span>
                    </div>
                    <div class="detail-row">
                        <span>TSIG Key:</span>
                        <span>${provider.config.tsigKey}</span>
                    </div>
                    <div class="detail-row">
                        <span>Algorithm:</span>
                        <span>${provider.config.tsigAlgorithm}</span>
                    </div>
                    <div class="detail-row">
                        <span>Timeout:</span>
                        <span>${provider.config.timeout}</span>
                    </div>
                </div>
                <div class="dns-provider-actions">
                    <button class="btn btn-danger btn-sm" onclick="ui.deleteDNSProvider('${provider.name}')">Delete</button>
                    <button class="btn btn-secondary btn-sm" onclick="ui.testDNSProvider('${provider.name}')">Test</button>
                </div>
            </div>
        `).join('');
    }

    populateDNSProviderDropdown(providers) {
        const select = document.getElementById('dns-provider');
        const currentValue = select.value;
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select DNS Provider...</option>';
        
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.name;
            option.textContent = `${provider.name} (${provider.config.nameserver})`;
            select.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (currentValue && providers.some(p => p.name === currentValue)) {
            select.value = currentValue;
        }
    }

    async handleDNSProviderSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const provider = {
            name: document.getElementById('provider-name').value,
            type: document.getElementById('provider-type').value,
            config: {
                nameserver: document.getElementById('nameserver').value,
                tsigKey: document.getElementById('tsig-key').value,
                tsigSecret: document.getElementById('tsig-secret').value,
                tsigAlgorithm: document.getElementById('tsig-algorithm').value,
                timeout: document.getElementById('dns-timeout').value,
                propagationTimeout: document.getElementById('propagation-timeout').value,
                pollingInterval: document.getElementById('polling-interval').value,
                ttl: parseInt(document.getElementById('dns-ttl').value)
            }
        };

        try {
            const response = await fetch('/api/dns-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(provider)
            });

            if (response.ok) {
                this.showNotification('DNS provider added successfully!', 'success');
                e.target.reset();
                this.loadDNSProviders();
            } else {
                const error = await response.text();
                throw new Error(error);
            }
        } catch (error) {
            this.showNotification(`Failed to add DNS provider: ${error.message}`, 'error');
        }
    }

    async deleteDNSProvider(name) {
        if (!confirm(`Are you sure you want to delete DNS provider "${name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/dns-providers/${name}`, { method: 'DELETE' });
            
            if (response.ok) {
                this.showNotification('DNS provider deleted successfully!', 'success');
                this.loadDNSProviders();
            } else {
                throw new Error('Failed to delete DNS provider');
            }
        } catch (error) {
            this.showNotification('Failed to delete DNS provider', 'error');
        }
    }

    async testDNSProvider(name) {
        try {
            this.showNotification('Testing DNS provider...', 'info');
            const response = await fetch(`/api/dns-providers/${name}/test`, { method: 'POST' });
            
            if (response.ok) {
                this.showNotification('DNS provider test successful!', 'success');
            } else {
                const error = await response.text();
                throw new Error(error);
            }
        } catch (error) {
            this.showNotification(`DNS provider test failed: ${error.message}`, 'error');
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

// Global function for switching tabs (called from HTML)
function switchTab(tabName) {
    ui.switchTab(tabName);
}