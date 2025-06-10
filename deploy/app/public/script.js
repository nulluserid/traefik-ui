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
        this.populateLabelGeneratorDropdowns();
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

        // Label Generator Event Listeners
        document.getElementById('label-enable-tls').addEventListener('change', (e) => this.toggleLabelTLSOptions(e.target.checked));
        document.getElementById('label-tls-method').addEventListener('change', (e) => this.handleLabelTLSMethodChange(e.target.value));
        document.getElementById('label-enable-crowdsec').addEventListener('change', (e) => this.toggleLabelMiddlewareOptions(e.target.checked));
        document.getElementById('generate-labels').addEventListener('click', () => this.generateLabels());
        document.getElementById('copy-labels').addEventListener('click', () => this.copyLabelsToClipboard());

        // Service Discovery Event Listeners
        document.getElementById('scan-services').addEventListener('click', () => this.scanDockerServices());
        document.getElementById('refresh-services').addEventListener('click', () => this.refreshServices());
        document.getElementById('service-filter').addEventListener('change', (e) => this.filterServices(e.target.value));
        document.getElementById('close-service-modal').addEventListener('click', () => this.closeServiceModal());
        document.getElementById('cancel-edit').addEventListener('click', () => this.closeServiceModal());
        document.getElementById('service-edit-form').addEventListener('submit', (e) => this.handleServiceEdit(e));

        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => this.useTemplate(card.dataset.template));
        });

        document.querySelectorAll('.label-template-card').forEach(card => {
            card.addEventListener('click', () => this.useLabelTemplate(card.dataset.template));
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

    // Label Generator Methods
    toggleLabelTLSOptions(enabled) {
        const tlsOptions = document.getElementById('label-tls-options');
        if (enabled) {
            tlsOptions.classList.remove('hidden');
            this.handleLabelTLSMethodChange(document.getElementById('label-tls-method').value);
        } else {
            tlsOptions.classList.add('hidden');
            document.getElementById('label-dns-provider-options').classList.add('hidden');
        }
    }

    handleLabelTLSMethodChange(tlsMethod) {
        const dnsProviderOptions = document.getElementById('label-dns-provider-options');
        
        // Show DNS provider selection for DNS challenges
        if (tlsMethod === 'letsencrypt-dns' || tlsMethod === 'letsencrypt-staging-dns') {
            dnsProviderOptions.classList.remove('hidden');
        } else {
            dnsProviderOptions.classList.add('hidden');
        }
    }

    toggleLabelMiddlewareOptions(enabled) {
        const middlewareOptions = document.getElementById('label-middleware-options');
        if (enabled) {
            middlewareOptions.classList.remove('hidden');
        } else {
            middlewareOptions.classList.add('hidden');
        }
    }

    async populateLabelGeneratorDropdowns() {
        // Populate DNS providers
        try {
            const response = await fetch('/api/dns-providers');
            const providers = await response.json();
            const select = document.getElementById('label-dns-provider');
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Select DNS Provider...</option>';
            
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.name;
                option.textContent = `${provider.name} (${provider.config.nameserver})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load DNS providers for label generator:', error);
        }

        // Populate middleware
        try {
            const response = await fetch('/api/middleware');
            const middleware = await response.json();
            const select = document.getElementById('label-middleware-select');
            
            select.innerHTML = '';
            middleware.forEach(mw => {
                const option = document.createElement('option');
                option.value = mw.name;
                option.textContent = mw.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load middleware for label generator:', error);
        }
    }

    generateLabels() {
        const serviceName = document.getElementById('label-service-name').value.trim();
        const hostname = document.getElementById('label-hostname').value.trim();
        const port = document.getElementById('label-port').value.trim();
        const path = document.getElementById('label-path').value.trim();
        const enableTls = document.getElementById('label-enable-tls').checked;
        const tlsMethod = document.getElementById('label-tls-method').value;
        const dnsProvider = document.getElementById('label-dns-provider').value;
        const enableCrowdSec = document.getElementById('label-enable-crowdsec').checked;
        const additionalMiddleware = Array.from(document.getElementById('label-middleware-select').selectedOptions).map(option => option.value);
        const ignoreTlsErrors = document.getElementById('label-ignore-tls-errors').checked;

        if (!serviceName || !hostname) {
            this.showNotification('Service name and hostname are required', 'error');
            return;
        }

        const labels = this.buildTraefikLabels({
            serviceName,
            hostname,
            port,
            path,
            enableTls,
            tlsMethod,
            dnsProvider,
            enableCrowdSec,
            additionalMiddleware,
            ignoreTlsErrors
        });

        this.displayGeneratedLabels(labels, serviceName);
    }

    buildTraefikLabels(config) {
        const labels = [];
        const { serviceName, hostname, port, path, enableTls, tlsMethod, dnsProvider, enableCrowdSec, additionalMiddleware, ignoreTlsErrors } = config;

        // Basic labels
        labels.push(`"traefik.enable=true"`);

        // Build rule
        let rule = `Host(\`${hostname}\`)`;
        if (path) {
            rule += ` && PathPrefix(\`${path}\`)`;
        }
        labels.push(`"traefik.http.routers.${serviceName}.rule=${rule}"`);

        // Set entrypoint
        if (enableTls) {
            labels.push(`"traefik.http.routers.${serviceName}.entrypoints=websecure"`);
            labels.push(`"traefik.http.routers.${serviceName}.tls=true"`);

            // TLS configuration
            if (tlsMethod === 'letsencrypt-http') {
                labels.push(`"traefik.http.routers.${serviceName}.tls.certresolver=letsencrypt"`);
            } else if (tlsMethod === 'letsencrypt-dns') {
                labels.push(`"traefik.http.routers.${serviceName}.tls.certresolver=letsencrypt-dns"`);
            } else if (tlsMethod === 'letsencrypt-staging-http') {
                labels.push(`"traefik.http.routers.${serviceName}.tls.certresolver=letsencrypt-staging"`);
            } else if (tlsMethod === 'letsencrypt-staging-dns') {
                labels.push(`"traefik.http.routers.${serviceName}.tls.certresolver=letsencrypt-staging-dns"`);
            }
        } else {
            labels.push(`"traefik.http.routers.${serviceName}.entrypoints=web"`);
        }

        // Service configuration
        if (port) {
            labels.push(`"traefik.http.services.${serviceName}.loadbalancer.server.port=${port}"`);
        }

        // Middleware
        const middleware = [];
        if (enableCrowdSec) {
            middleware.push('crowdsec-bouncer');
        }
        if (additionalMiddleware.length > 0) {
            middleware.push(...additionalMiddleware);
        }
        if (middleware.length > 0) {
            labels.push(`"traefik.http.routers.${serviceName}.middlewares=${middleware.join(',')}"`);
        }

        // Backend TLS settings
        if (ignoreTlsErrors) {
            labels.push(`"traefik.http.services.${serviceName}.loadbalancer.serverstransport=insecureTransport"`);
        }

        return labels;
    }

    displayGeneratedLabels(labels, serviceName) {
        const labelsOutput = document.getElementById('generated-labels-output');
        const composeExample = document.getElementById('compose-example');
        const section = document.getElementById('generated-labels-section');

        // Display labels
        const labelText = labels.map(label => `      - ${label}`).join('\n');
        labelsOutput.textContent = labelText;

        // Display compose example
        const composeText = `version: '3.8'

services:
  ${serviceName}:
    image: your-app-image:latest
    labels:
${labelText}
    networks:
      - traefik

networks:
  traefik:
    external: true`;
        
        composeExample.textContent = composeText;

        // Show the section
        section.classList.remove('hidden');
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async copyLabelsToClipboard() {
        const labelsText = document.getElementById('generated-labels-output').textContent;
        const copyButton = document.getElementById('copy-labels');

        try {
            await navigator.clipboard.writeText(labelsText);
            
            // Visual feedback
            const originalText = copyButton.textContent;
            copyButton.classList.add('copied');
            copyButton.textContent = 'Copied!';
            
            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.textContent = originalText;
            }, 2000);
            
            this.showNotification('Labels copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = labelsText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showNotification('Labels copied to clipboard!', 'success');
        }
    }

    useLabelTemplate(templateType) {
        const templates = {
            'simple-web-app': {
                serviceName: 'my-app',
                hostname: 'app.example.com',
                port: '3000',
                path: '',
                enableTls: true,
                tlsMethod: 'letsencrypt-dns',
                enableCrowdSec: false,
                ignoreTlsErrors: false
            },
            'api-service': {
                serviceName: 'api',
                hostname: 'api.example.com',
                port: '8080',
                path: '/api',
                enableTls: true,
                tlsMethod: 'letsencrypt-dns',
                enableCrowdSec: false,
                ignoreTlsErrors: false
            },
            'protected-service': {
                serviceName: 'secure-app',
                hostname: 'secure.example.com',
                port: '3000',
                path: '',
                enableTls: true,
                tlsMethod: 'letsencrypt-dns',
                enableCrowdSec: true,
                ignoreTlsErrors: false
            },
            'development-service': {
                serviceName: 'dev-app',
                hostname: 'dev.localhost',
                port: '3000',
                path: '',
                enableTls: false,
                tlsMethod: 'letsencrypt-http',
                enableCrowdSec: false,
                ignoreTlsErrors: true
            }
        };

        const template = templates[templateType];
        if (!template) return;

        // Fill form fields
        document.getElementById('label-service-name').value = template.serviceName;
        document.getElementById('label-hostname').value = template.hostname;
        document.getElementById('label-port').value = template.port;
        document.getElementById('label-path').value = template.path;
        document.getElementById('label-enable-tls').checked = template.enableTls;
        document.getElementById('label-tls-method').value = template.tlsMethod;
        document.getElementById('label-enable-crowdsec').checked = template.enableCrowdSec;
        document.getElementById('label-ignore-tls-errors').checked = template.ignoreTlsErrors;

        // Trigger change events to show/hide relevant sections
        document.getElementById('label-enable-tls').dispatchEvent(new Event('change'));
        document.getElementById('label-tls-method').dispatchEvent(new Event('change'));
        document.getElementById('label-enable-crowdsec').dispatchEvent(new Event('change'));

        this.showNotification(`Applied ${templateType.replace('-', ' ')} template`, 'success');
    }

    // Service Discovery Methods
    async scanDockerServices() {
        const scanStatus = document.getElementById('scan-status');
        const scanButton = document.getElementById('scan-services');
        
        try {
            scanStatus.textContent = '🔍 Scanning Docker containers...';
            scanButton.disabled = true;
            
            const response = await fetch('/api/docker/services');
            if (!response.ok) {
                throw new Error('Failed to connect to Docker daemon');
            }
            
            const services = await response.json();
            this.displayDiscoveredServices(services);
            
            scanStatus.textContent = `✅ Found ${services.length} containers`;
            
            // Also load networks
            await this.loadDockerNetworks();
            
        } catch (error) {
            console.error('Failed to scan Docker services:', error);
            scanStatus.textContent = '❌ Failed to scan Docker services';
            this.showNotification(error.message, 'error');
        } finally {
            scanButton.disabled = false;
        }
    }

    async refreshServices() {
        await this.scanDockerServices();
    }

    displayDiscoveredServices(services) {
        const container = document.getElementById('discovered-services');
        
        if (services.length === 0) {
            container.innerHTML = '<p>No Docker containers found.</p>';
            return;
        }

        container.innerHTML = services.map(service => {
            const traefikEnabled = service.traefikConfig.enabled;
            const routerNames = Object.keys(service.traefikConfig.routers);
            const primaryRouter = routerNames[0];
            const routerConfig = primaryRouter ? service.traefikConfig.routers[primaryRouter] : {};
            
            // Get status class
            let statusClass = service.status;
            if (traefikEnabled) statusClass += ' traefik-enabled';
            
            // Format ports
            const ports = service.ports.map(p => 
                p.PublicPort ? `${p.PrivatePort}:${p.PublicPort}` : p.PrivatePort
            ).join(', ') || 'None';
            
            // Format Traefik labels for display
            const traefikLabels = Object.entries(service.labels.traefik).map(([key, value]) => 
                `<div class="label-item"><span class="label-key">${key}:</span> ${value}</div>`
            ).join('');

            return `
                <div class="discovered-service-card ${statusClass}" data-id="${service.id}">
                    <div class="service-header">
                        <div class="service-info">
                            <div class="service-title">${service.name}</div>
                            <div class="service-subtitle">${service.compose.project}/${service.compose.service}</div>
                        </div>
                        <div class="service-status">
                            <span class="status-badge ${service.status}">${service.status.toUpperCase()}</span>
                            ${traefikEnabled ? 
                                '<span class="status-badge traefik-enabled">TRAEFIK</span>' : 
                                '<span class="status-badge traefik-disabled">NO TRAEFIK</span>'
                            }
                        </div>
                    </div>
                    
                    <div class="service-details">
                        <div class="service-detail-section">
                            <div class="detail-label">Image</div>
                            <div class="detail-value">${service.image}</div>
                        </div>
                        <div class="service-detail-section">
                            <div class="detail-label">Ports</div>
                            <div class="detail-value">${ports}</div>
                        </div>
                        <div class="service-detail-section">
                            <div class="detail-label">Networks</div>
                            <div class="detail-value">${service.networks.join(', ') || 'None'}</div>
                        </div>
                        ${routerConfig.rule ? `
                        <div class="service-detail-section">
                            <div class="detail-label">Route Rule</div>
                            <div class="detail-value">${routerConfig.rule}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${traefikLabels ? `
                    <div class="service-labels">
                        <h4>Traefik Labels (${Object.keys(service.labels.traefik).length})</h4>
                        <div class="labels-list">
                            ${traefikLabels}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="service-actions">
                        <button class="btn btn-secondary btn-sm" onclick="ui.viewServiceDetails('${service.id}')">
                            📋 Details
                        </button>
                        ${traefikEnabled ? `
                        <button class="btn btn-primary btn-sm" onclick="ui.editServiceLabels('${service.id}')">
                            ✏️ Edit Labels
                        </button>
                        ` : `
                        <button class="btn btn-accent btn-sm" onclick="ui.enableTraefik('${service.id}')">
                            🚀 Enable Traefik
                        </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    filterServices(filter) {
        const cards = document.querySelectorAll('.discovered-service-card');
        
        cards.forEach(card => {
            let show = true;
            
            switch (filter) {
                case 'running':
                    show = card.classList.contains('running');
                    break;
                case 'stopped':
                    show = card.classList.contains('stopped');
                    break;
                case 'traefik-enabled':
                    show = card.classList.contains('traefik-enabled');
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    async loadDockerNetworks() {
        try {
            const response = await fetch('/api/docker/networks');
            if (!response.ok) {
                throw new Error('Failed to load Docker networks');
            }
            
            const networks = await response.json();
            this.displayDockerNetworks(networks);
            
        } catch (error) {
            console.error('Failed to load Docker networks:', error);
            document.getElementById('docker-networks').innerHTML = '<p>Failed to load Docker networks</p>';
        }
    }

    displayDockerNetworks(networks) {
        const container = document.getElementById('docker-networks');
        
        if (networks.length === 0) {
            container.innerHTML = '<p>No Docker networks found.</p>';
            return;
        }

        // Filter out system networks for cleaner display
        const userNetworks = networks.filter(net => 
            !['bridge', 'host', 'none'].includes(net.name)
        );

        container.innerHTML = userNetworks.map(network => `
            <div class="network-card">
                <div class="network-header">
                    <span class="network-name">${network.name}</span>
                    <span class="network-driver">${network.driver.toUpperCase()}</span>
                </div>
                <div class="network-details">
                    <div>ID: ${network.id.substring(0, 12)}</div>
                    <div>Scope: ${network.scope}</div>
                    <div>Created: ${new Date(network.created).toLocaleDateString()}</div>
                </div>
                ${network.containers.length > 0 ? `
                <div class="network-containers">
                    <h4>Connected Containers (${network.containers.length})</h4>
                    <div class="container-list">
                        ${network.containers.map(container => 
                            `<span class="container-badge">${container.name}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    async viewServiceDetails(serviceId) {
        try {
            const response = await fetch(`/api/docker/status/${serviceId}`);
            if (!response.ok) {
                throw new Error('Failed to get service details');
            }
            
            const details = await response.json();
            
            // Create a simple details display (could be enhanced with a modal)
            const detailsHtml = `
                <div class="service-details-popup">
                    <h3>Service Details: ${details.name}</h3>
                    <pre>${JSON.stringify(details, null, 2)}</pre>
                </div>
            `;
            
            this.showNotification(`Service ${details.name} details logged to console`, 'info');
            console.log('Service Details:', details);
            
        } catch (error) {
            this.showNotification('Failed to get service details', 'error');
        }
    }

    editServiceLabels(serviceId) {
        // For now, just show the modal with a message
        // In a full implementation, this would populate the modal with current labels
        document.getElementById('edit-container-id').value = serviceId;
        document.getElementById('service-edit-modal').classList.remove('hidden');
        
        this.showNotification('Label editing interface opened (implementation pending)', 'info');
    }

    enableTraefik(serviceId) {
        // This would typically generate basic Traefik labels for the service
        this.showNotification('Traefik enablement requires container recreation with labels', 'info');
        
        // Could integrate with the Label Generator to create appropriate labels
        this.switchTab('label-generator');
    }

    closeServiceModal() {
        document.getElementById('service-edit-modal').classList.add('hidden');
    }

    async handleServiceEdit(e) {
        e.preventDefault();
        
        const containerId = document.getElementById('edit-container-id').value;
        const formData = new FormData(e.target);
        
        // Build labels object from form
        const labels = {};
        
        // This is a simplified implementation
        // In practice, you'd build the complete label set based on form inputs
        
        try {
            const response = await fetch(`/api/docker/labels/${containerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels })
            });
            
            if (response.ok) {
                this.showNotification('Labels updated (container recreation required)', 'success');
                this.closeServiceModal();
            } else {
                throw new Error('Failed to update labels');
            }
        } catch (error) {
            this.showNotification('Failed to update service labels', 'error');
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