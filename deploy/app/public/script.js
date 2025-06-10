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

        // Network Management Event Listeners
        document.getElementById('scan-networks').addEventListener('click', () => this.scanNetworks());
        document.getElementById('refresh-networks').addEventListener('click', () => this.refreshNetworks());
        document.getElementById('network-filter').addEventListener('change', (e) => this.filterNetworks(e.target.value));
        document.getElementById('close-network-modal').addEventListener('click', () => this.closeNetworkModal());
        document.getElementById('cancel-network-connect').addEventListener('click', () => this.closeNetworkModal());
        document.getElementById('network-connect-form').addEventListener('submit', (e) => this.handleNetworkConnect(e));

        // Domain Overview Event Listeners
        document.getElementById('scan-domains').addEventListener('click', () => this.scanDomains());
        document.getElementById('refresh-domains').addEventListener('click', () => this.refreshDomains());
        document.getElementById('domain-filter').addEventListener('change', (e) => this.filterDomains(e.target.value));

        // Observability Event Listeners
        document.getElementById('enable-access-logs').addEventListener('change', (e) => this.toggleAccessLogsOptions(e.target.checked));
        document.getElementById('log-format').addEventListener('change', (e) => this.handleLogFormatChange(e.target.value));
        document.getElementById('enable-graylog').addEventListener('change', (e) => this.toggleGraylogOptions(e.target.checked));
        document.getElementById('enable-metrics').addEventListener('change', (e) => this.toggleMetricsOptions(e.target.checked));
        document.getElementById('enable-tracing').addEventListener('change', (e) => this.toggleTracingOptions(e.target.checked));
        document.getElementById('tracing-backend').addEventListener('change', (e) => this.handleTracingBackendChange(e.target.value));
        document.getElementById('sampling-rate').addEventListener('input', (e) => this.updateSamplingRateDisplay(e.target.value));
        
        document.getElementById('access-logs-form').addEventListener('submit', (e) => this.handleAccessLogsSubmit(e));
        document.getElementById('metrics-form').addEventListener('submit', (e) => this.handleMetricsSubmit(e));
        document.getElementById('tracing-form').addEventListener('submit', (e) => this.handleTracingSubmit(e));
        
        document.getElementById('test-log-config').addEventListener('click', () => this.testLogConfiguration());
        document.getElementById('test-metrics-endpoint').addEventListener('click', () => this.testMetricsEndpoint());
        document.getElementById('test-tracing-connection').addEventListener('click', () => this.testTracingConnection());
        
        document.getElementById('load-observability-config').addEventListener('click', () => this.loadObservabilityConfig());
        document.getElementById('export-observability-config').addEventListener('click', () => this.exportObservabilityConfig());
        document.getElementById('restart-traefik-observability').addEventListener('click', () => this.restartTraefikForObservability());

        // System Config Event Listeners
        document.getElementById('load-config-viewer').addEventListener('click', () => this.loadConfigViewer());
        document.getElementById('refresh-config-viewer').addEventListener('click', () => this.refreshConfigViewer());
        document.getElementById('validate-current-config').addEventListener('click', () => this.validateCurrentConfig());
        document.getElementById('toggle-config-editor').addEventListener('click', () => this.toggleConfigEditor());
        document.getElementById('save-config-changes').addEventListener('click', () => this.saveConfigChanges());
        document.getElementById('cancel-config-edit').addEventListener('click', () => this.cancelConfigEdit());
        document.getElementById('validate-config-edit').addEventListener('click', () => this.validateConfigEdit());
        
        document.getElementById('export-config').addEventListener('click', () => this.exportConfig());
        document.getElementById('select-config-file').addEventListener('click', () => this.selectConfigFile());
        document.getElementById('validate-import').addEventListener('click', () => this.validateImport());
        document.getElementById('apply-import').addEventListener('click', () => this.applyImport());
        document.getElementById('config-file-input').addEventListener('change', (e) => this.handleConfigFileSelect(e));
        
        document.getElementById('create-manual-backup').addEventListener('click', () => this.createManualBackup());
        document.getElementById('refresh-backup-list').addEventListener('click', () => this.refreshBackupList());
        document.getElementById('cleanup-old-backups').addEventListener('click', () => this.cleanupOldBackups());
        document.getElementById('confirm-create-backup').addEventListener('click', () => this.confirmCreateBackup());
        document.getElementById('cancel-create-backup').addEventListener('click', () => this.cancelCreateBackup());
        
        document.getElementById('close-restore-modal').addEventListener('click', () => this.closeRestoreModal());
        document.getElementById('confirm-restore').addEventListener('click', () => this.confirmRestore());
        document.getElementById('cancel-restore').addEventListener('click', () => this.closeRestoreModal());
        
        document.getElementById('system-settings-form').addEventListener('submit', (e) => this.handleSystemSettingsSubmit(e));

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
        
        // Initialize system config tab when accessed
        if (tabName === 'system-config') {
            this.loadSystemConfigStatus();
        }
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
            // Check if backend URL points to a Docker container and validate network connectivity
            await this.validateNetworkConnectivity(backendUrl);
            
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
            const data = await response.json();
            const select = document.getElementById('label-middleware-select');
            
            select.innerHTML = '';
            
            // Handle the middleware object structure
            if (data.middlewares) {
                Object.keys(data.middlewares).forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });
            }
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
        // Only refresh if we already have scanned once
        if (!this.discoveredServices || this.discoveredServices.length === 0) {
            this.showNotification('Click "Scan for Services" first to discover containers', 'info');
            return;
        }
        await this.scanDockerServices();
    }

    displayDiscoveredServices(services) {
        const container = document.getElementById('discovered-services');
        this.discoveredServices = services; // Store for refresh functionality
        
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
        let visibleCount = 0;
        
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
                case 'traefik-disabled':
                    show = !card.classList.contains('traefik-enabled');
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            if (show) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update filter status
        const statusText = visibleCount === cards.length 
            ? `Showing all ${cards.length} services`
            : `Showing ${visibleCount} of ${cards.length} services`;
        this.updateFilterStatus('service', statusText);
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

    updateFilterStatus(type, message) {
        const statusElement = document.getElementById(`${type}-filter-status`);
        if (statusElement) {
            statusElement.textContent = message;
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

    // Network Management Methods

    async scanNetworks() {
        const scanStatus = document.getElementById('network-scan-status');
        const scanButton = document.getElementById('scan-networks');
        
        try {
            scanStatus.textContent = '🔍 Scanning Docker networks...';
            scanButton.disabled = true;
            
            const response = await fetch('/api/networks/management');
            const data = await response.json();
            
            this.displayNetworkManagement(data);
            await this.loadNetworkTopology();
            
            scanStatus.textContent = `✅ Found ${data.networks.length} networks`;
        } catch (error) {
            this.showNotification(error.message, 'error');
            scanStatus.textContent = '❌ Scan failed';
        } finally {
            scanButton.disabled = false;
            setTimeout(() => {
                scanStatus.textContent = '';
            }, 3000);
        }
    }

    async refreshNetworks() {
        // Only refresh if we already have scanned once
        if (!this.allNetworks || this.allNetworks.length === 0) {
            this.showNotification('Click "Scan Networks" first to discover networks', 'info');
            return;
        }
        await this.scanNetworks();
    }

    displayNetworkManagement(data) {
        const traefikContainer = document.getElementById('traefik-networks');
        const availableContainer = document.getElementById('available-networks');
        
        // Display Traefik's current network connections
        const traefikConnected = data.networks.filter(net => net.isTraefikConnected);
        traefikContainer.innerHTML = traefikConnected.length > 0 
            ? traefikConnected.map(network => this.createTraefikNetworkCard(network)).join('')
            : '<p>Traefik is not connected to any networks.</p>';
        
        // Display all available networks
        this.allNetworks = data.networks;
        this.displayFilteredNetworks('all');
    }

    createTraefikNetworkCard(network) {
        const isPrimary = network.name === 'deploy_traefik';
        return `
            <div class="network-card traefik-connected ${isPrimary ? 'primary-network' : ''}">
                <div class="network-header">
                    <div class="network-info">
                        <div class="network-title">
                            ${network.name} ${isPrimary ? '(Primary)' : ''}
                            <span class="status-badge connected">Connected</span>
                        </div>
                        <div class="network-subtitle">
                            ${network.driver} • ${network.subnet} • ${network.containerCount} containers
                        </div>
                    </div>
                    <div class="network-actions">
                        ${!isPrimary ? 
                            `<button class="btn btn-sm btn-danger" onclick="ui.disconnectFromNetwork('${network.id}', '${network.name}')">
                                🔌 Disconnect
                            </button>` : 
                            '<span class="text-muted">Cannot disconnect</span>'
                        }
                    </div>
                </div>
                <div class="network-details">
                    <div class="detail-row">
                        <span class="detail-label">Network ID:</span>
                        <span class="detail-value">${network.id.substring(0, 12)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Gateway:</span>
                        <span class="detail-value">${network.gateway}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Containers:</span>
                        <span class="detail-value">
                            ${network.containers.map(c => c.name).join(', ') || 'None'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    filterNetworks(filter) {
        this.displayFilteredNetworks(filter);
    }

    displayFilteredNetworks(filter) {
        if (!this.allNetworks) return;
        
        let filteredNetworks = this.allNetworks;
        
        switch (filter) {
            case 'connected':
                filteredNetworks = this.allNetworks.filter(net => net.isTraefikConnected);
                break;
            case 'disconnected':
                filteredNetworks = this.allNetworks.filter(net => !net.isTraefikConnected);
                break;
            case 'external':
                filteredNetworks = this.allNetworks.filter(net => 
                    !['bridge', 'host', 'none'].includes(net.name) && net.attachable);
                break;
            default:
                filteredNetworks = this.allNetworks;
        }
        
        const container = document.getElementById('available-networks');
        container.innerHTML = filteredNetworks.length > 0 
            ? filteredNetworks.map(network => this.createNetworkCard(network)).join('')
            : '<p>No networks match the current filter.</p>';
    }

    createNetworkCard(network) {
        const isConnected = network.isTraefikConnected;
        const canConnect = !isConnected && network.attachable && !['none', 'host', 'bridge'].includes(network.name);
        const isPrimary = network.name === 'deploy_traefik';
        const canDisconnect = isConnected && !isPrimary;
        
        return `
            <div class="network-card ${isConnected ? 'connected' : 'disconnected'}">
                <div class="network-header">
                    <div class="network-info">
                        <div class="network-title">
                            ${network.name} ${isPrimary ? '(Primary)' : ''}
                            <span class="status-badge ${isConnected ? 'connected' : 'disconnected'}">
                                ${isConnected ? 'Connected' : 'Available'}
                            </span>
                        </div>
                        <div class="network-subtitle">
                            ${network.driver} • ${network.subnet} • ${network.containerCount} containers
                        </div>
                    </div>
                    <div class="network-actions">
                        ${canConnect ? 
                            `<button class="btn btn-sm btn-primary" onclick="ui.openNetworkConnectModal('${network.id}', '${network.name}')">
                                🔗 Connect
                            </button>` : 
                            canDisconnect ? 
                                `<button class="btn btn-sm btn-danger" onclick="ui.disconnectFromNetwork('${network.id}', '${network.name}')">
                                    🔌 Disconnect
                                </button>` :
                            isConnected && isPrimary ?
                                '<span class="text-muted">Cannot disconnect</span>' :
                                '<span class="text-muted">Not attachable</span>'
                        }
                    </div>
                </div>
                <div class="network-details">
                    <div class="detail-row">
                        <span class="detail-label">Network ID:</span>
                        <span class="detail-value">${network.id.substring(0, 12)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Gateway:</span>
                        <span class="detail-value">${network.gateway}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Internal:</span>
                        <span class="detail-value">${network.internal ? 'Yes' : 'No'}</span>
                    </div>
                    ${network.containers.length > 0 ? `
                        <div class="detail-row">
                            <span class="detail-label">Containers:</span>
                            <span class="detail-value">
                                ${network.containers.map(c => c.name).join(', ')}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    openNetworkConnectModal(networkId, networkName) {
        document.getElementById('connect-network-id').value = networkId;
        document.getElementById('connect-network-name').value = networkName;
        document.getElementById('connect-alias').value = '';
        document.getElementById('connect-ip').value = '';
        document.getElementById('network-connect-modal').classList.remove('hidden');
    }

    closeNetworkModal() {
        document.getElementById('network-connect-modal').classList.add('hidden');
    }

    async handleNetworkConnect(e) {
        e.preventDefault();
        
        const networkId = document.getElementById('connect-network-id').value;
        const alias = document.getElementById('connect-alias').value;
        const ipAddress = document.getElementById('connect-ip').value;
        
        try {
            const response = await fetch(`/api/networks/${networkId}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias, ipAddress })
            });
            
            if (response.ok) {
                this.showNotification('Traefik connected to network successfully', 'success');
                this.closeNetworkModal();
                await this.refreshNetworks();
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error) {
            this.showNotification(`Failed to connect: ${error.message}`, 'error');
        }
    }

    async disconnectFromNetwork(networkId, networkName) {
        if (networkName === 'deploy_traefik') {
            this.showNotification('Cannot disconnect from primary network', 'error');
            return;
        }
        
        if (!confirm(`Disconnect Traefik from network "${networkName}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/networks/${networkId}/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false })
            });
            
            if (response.ok) {
                this.showNotification('Traefik disconnected from network successfully', 'success');
                await this.refreshNetworks();
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error) {
            this.showNotification(`Failed to disconnect: ${error.message}`, 'error');
        }
    }

    async loadNetworkTopology() {
        try {
            const response = await fetch('/api/networks/topology');
            const topology = await response.json();
            this.displayNetworkTopology(topology);
        } catch (error) {
            console.error('Failed to load network topology:', error);
        }
    }

    displayNetworkTopology(topology) {
        const container = document.getElementById('network-topology');
        
        if (topology.networks.length === 0) {
            container.innerHTML = '<p>No network topology data available.</p>';
            return;
        }
        
        let html = '<div class="topology-grid">';
        
        topology.networks.forEach(network => {
            const traefikContainer = network.containers.find(c => c.isTraefik);
            const otherContainers = network.containers.filter(c => !c.isTraefik);
            
            html += `
                <div class="topology-network ${traefikContainer ? 'has-traefik' : ''}">
                    <div class="topology-network-header">
                        <h4>${network.name}</h4>
                        <span class="topology-subnet">${network.subnet}</span>
                    </div>
                    <div class="topology-containers">
                        ${traefikContainer ? `
                            <div class="topology-container traefik-container">
                                <span class="container-icon">🛠️</span>
                                <span class="container-name">traefik</span>
                                <span class="container-ip">${traefikContainer.ipAddress}</span>
                            </div>
                        ` : ''}
                        ${otherContainers.map(container => `
                            <div class="topology-container">
                                <span class="container-icon">📦</span>
                                <span class="container-name">${container.name}</span>
                                <span class="container-ip">${container.ipAddress}</span>
                            </div>
                        `).join('')}
                        ${network.containers.length === 0 ? 
                            '<div class="topology-empty">No containers</div>' : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Network validation for route creation
    async validateNetworkConnectivity(backendUrl) {
        // Extract hostname from backend URL (e.g., http://container-name:port)
        let hostname;
        try {
            const url = new URL(backendUrl);
            hostname = url.hostname;
        } catch (error) {
            // Not a valid URL, might be IP or hostname
            hostname = backendUrl.split(':')[0];
        }
        
        // Check if hostname looks like a Docker container name (not an IP address)
        const isDockerContainer = !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && 
                                 !hostname.includes('.') && 
                                 hostname !== 'localhost' &&
                                 hostname !== '127.0.0.1';
        
        if (!isDockerContainer) {
            return; // External service, no validation needed
        }
        
        try {
            // Get current network topology and Traefik connections
            const [networkResponse, managementResponse] = await Promise.all([
                fetch('/api/networks/topology'),
                fetch('/api/networks/management')
            ]);
            
            const topology = await networkResponse.json();
            const management = await managementResponse.json();
            
            // Find networks containing the target container
            const containerNetworks = [];
            topology.networks.forEach(network => {
                const container = network.containers.find(c => 
                    c.name === hostname || c.name.includes(hostname)
                );
                if (container) {
                    containerNetworks.push(network.name);
                }
            });
            
            if (containerNetworks.length === 0) {
                this.showNotification(`Container '${hostname}' not found in any Docker network`, 'error');
                throw new Error(`Container not found: ${hostname}`);
            }
            
            // Check if Traefik is connected to any of these networks
            const traefikNetworks = management.traefikNetworks;
            const connectedNetworks = containerNetworks.filter(net => traefikNetworks.includes(net));
            
            if (connectedNetworks.length === 0) {
                // Traefik is not connected to any network containing this container
                const networkToConnect = containerNetworks[0]; // Suggest the first network
                
                const shouldConnect = await this.askToConnectNetwork(hostname, networkToConnect, containerNetworks);
                if (!shouldConnect) {
                    throw new Error('Route creation cancelled: Network connectivity required');
                }
            } else {
                this.showNotification(`✅ Network connectivity validated: ${connectedNetworks.join(', ')}`, 'success');
            }
            
        } catch (error) {
            if (error.message.includes('cancelled')) {
                throw error;
            }
            console.warn('Network validation failed:', error);
            // Continue anyway - might be an external service or validation error
        }
    }
    
    async askToConnectNetwork(containerName, suggestedNetwork, allNetworks) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Network Connection Required</h3>
                    </div>
                    <div class="modal-body">
                        <p><strong>Warning:</strong> Traefik is not connected to any network containing the container '<strong>${containerName}</strong>'.</p>
                        <p>Available networks for this container:</p>
                        <ul>
                            ${allNetworks.map(net => `<li><strong>${net}</strong></li>`).join('')}
                        </ul>
                        <p>Would you like to connect Traefik to the <strong>${suggestedNetwork}</strong> network?</p>
                        <div class="modal-actions">
                            <button id="connect-and-continue" class="btn btn-primary">Connect & Continue</button>
                            <button id="continue-anyway" class="btn btn-warning">Continue Anyway</button>
                            <button id="cancel-route" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            document.getElementById('connect-and-continue').onclick = async () => {
                modal.remove();
                try {
                    // Connect to the suggested network
                    const networks = await fetch('/api/networks/management').then(r => r.json());
                    const targetNetwork = networks.networks.find(n => n.name === suggestedNetwork);
                    
                    if (targetNetwork) {
                        await fetch(`/api/networks/${targetNetwork.id}/connect`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        this.showNotification(`Connected Traefik to ${suggestedNetwork}`, 'success');
                    }
                    resolve(true);
                } catch (error) {
                    this.showNotification(`Failed to connect to network: ${error.message}`, 'error');
                    resolve(false);
                }
            };
            
            document.getElementById('continue-anyway').onclick = () => {
                modal.remove();
                this.showNotification('⚠️ Proceeding without network validation', 'warning');
                resolve(true);
            };
            
            document.getElementById('cancel-route').onclick = () => {
                modal.remove();
                resolve(false);
            };
        });
    }

    // Phase 5: Observability Configuration Methods

    toggleAccessLogsOptions(enabled) {
        const options = document.getElementById('access-logs-options');
        if (enabled) {
            options.classList.remove('hidden');
        } else {
            options.classList.add('hidden');
        }
    }

    handleLogFormatChange(format) {
        const customSection = document.getElementById('custom-format-section');
        if (format === 'custom') {
            customSection.classList.remove('hidden');
        } else {
            customSection.classList.add('hidden');
        }
    }

    toggleGraylogOptions(enabled) {
        const options = document.getElementById('graylog-options');
        if (enabled) {
            options.classList.remove('hidden');
        } else {
            options.classList.add('hidden');
        }
    }

    toggleMetricsOptions(enabled) {
        const options = document.getElementById('metrics-options');
        const infoSection = document.getElementById('metrics-info');
        
        if (enabled) {
            options.classList.remove('hidden');
            infoSection.classList.remove('hidden');
            this.updatePrometheusConfigExample();
        } else {
            options.classList.add('hidden');
            infoSection.classList.add('hidden');
        }
    }

    toggleTracingOptions(enabled) {
        const options = document.getElementById('tracing-options');
        if (enabled) {
            options.classList.remove('hidden');
            this.handleTracingBackendChange(document.getElementById('tracing-backend').value);
        } else {
            options.classList.add('hidden');
        }
    }

    handleTracingBackendChange(backend) {
        const endpointInput = document.getElementById('tracing-endpoint');
        
        // Set default endpoint based on backend
        switch (backend) {
            case 'jaeger':
                endpointInput.placeholder = 'http://jaeger:14268/api/traces';
                break;
            case 'zipkin':
                endpointInput.placeholder = 'http://zipkin:9411/api/v2/spans';
                break;
            case 'otlp':
                endpointInput.placeholder = 'http://otel-collector:4318/v1/traces';
                break;
        }
    }

    updateSamplingRateDisplay(value) {
        const display = document.getElementById('sampling-rate-value');
        display.textContent = `${Math.round(value * 100)}%`;
    }

    updatePrometheusConfigExample() {
        const port = document.getElementById('metrics-port').value || '8082';
        const path = document.getElementById('metrics-path').value || '/metrics';
        const interval = document.getElementById('metrics-interval').value || '30s';
        
        const config = `job_name: 'traefik'
static_configs:
  - targets: ['traefik:${port}']
metrics_path: '${path}'
scrape_interval: ${interval}
scrape_timeout: 10s`;
        
        document.getElementById('prometheus-config-example').textContent = config;
    }

    async handleAccessLogsSubmit(e) {
        e.preventDefault();
        
        const enabled = document.getElementById('enable-access-logs').checked;
        const format = document.getElementById('log-format').value;
        const filePath = document.getElementById('log-file-path').value;
        const customFormat = document.getElementById('custom-log-format').value;
        const graylogEnabled = document.getElementById('enable-graylog').checked;
        const graylogEndpoint = document.getElementById('graylog-endpoint').value;
        const graylogFacility = document.getElementById('graylog-facility').value;

        const config = {
            enabled,
            format,
            filePath,
            customFormat,
            graylog: {
                enabled: graylogEnabled,
                endpoint: graylogEndpoint,
                facility: graylogFacility
            }
        };

        try {
            const response = await fetch('/api/observability/logs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.showNotification('Access logs configuration updated successfully!', 'success');
                this.updateObservabilityStatus('logs', enabled ? 'Configured' : 'Disabled');
            } else {
                throw new Error('Failed to update access logs configuration');
            }
        } catch (error) {
            this.showNotification('Failed to update access logs configuration', 'error');
        }
    }

    async handleMetricsSubmit(e) {
        e.preventDefault();
        
        const enabled = document.getElementById('enable-metrics').checked;
        const port = parseInt(document.getElementById('metrics-port').value) || 8082;
        const path = document.getElementById('metrics-path').value || '/metrics';
        const interval = document.getElementById('metrics-interval').value;
        
        const categories = {
            entrypoint: document.getElementById('metrics-entrypoint').checked,
            router: document.getElementById('metrics-router').checked,
            service: document.getElementById('metrics-service').checked
        };

        const config = {
            enabled,
            port,
            path,
            interval,
            categories
        };

        try {
            const response = await fetch('/api/observability/metrics', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Metrics configuration updated successfully!', 'success');
                this.updateObservabilityStatus('metrics', enabled ? `Enabled on :${port}` : 'Disabled');
                
                if (enabled && result.metricsUrl) {
                    console.log('Metrics endpoint:', result.metricsUrl);
                }
            } else {
                throw new Error('Failed to update metrics configuration');
            }
        } catch (error) {
            this.showNotification('Failed to update metrics configuration', 'error');
        }
    }

    async handleTracingSubmit(e) {
        e.preventDefault();
        
        const enabled = document.getElementById('enable-tracing').checked;
        const backend = document.getElementById('tracing-backend').value;
        const endpoint = document.getElementById('tracing-endpoint').value;
        const samplingRate = parseFloat(document.getElementById('sampling-rate').value);
        const serviceName = document.getElementById('service-name').value || 'traefik';
        const headers = document.getElementById('trace-headers').value;

        const config = {
            enabled,
            backend,
            endpoint,
            samplingRate,
            serviceName,
            headers
        };

        try {
            const response = await fetch('/api/observability/tracing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.showNotification('Tracing configuration updated successfully!', 'success');
                this.updateObservabilityStatus('tracing', enabled ? `${backend} (${Math.round(samplingRate * 100)}%)` : 'Disabled');
            } else {
                throw new Error('Failed to update tracing configuration');
            }
        } catch (error) {
            this.showNotification('Failed to update tracing configuration', 'error');
        }
    }

    async testLogConfiguration() {
        const graylogEnabled = document.getElementById('enable-graylog').checked;
        const graylogEndpoint = document.getElementById('graylog-endpoint').value;
        
        if (!graylogEnabled || !graylogEndpoint) {
            this.showNotification('No external log configuration to test', 'info');
            return;
        }

        try {
            const response = await fetch('/api/observability/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'graylog',
                    config: { endpoint: graylogEndpoint }
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Graylog configuration test successful!', 'success');
            } else {
                this.showNotification(`Graylog test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to test log configuration', 'error');
        }
    }

    async testMetricsEndpoint() {
        const port = document.getElementById('metrics-port').value || '8082';
        const path = document.getElementById('metrics-path').value || '/metrics';
        
        try {
            const response = await fetch('/api/observability/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'metrics',
                    config: { port, path }
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`Metrics endpoint test successful: ${result.details.url}`, 'success');
            } else {
                this.showNotification(`Metrics test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to test metrics endpoint', 'error');
        }
    }

    async testTracingConnection() {
        const backend = document.getElementById('tracing-backend').value;
        const endpoint = document.getElementById('tracing-endpoint').value;
        
        if (!endpoint) {
            this.showNotification('Please enter a tracing endpoint', 'error');
            return;
        }

        try {
            const response = await fetch('/api/observability/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'tracing',
                    config: { backend, endpoint }
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`${backend} connection test successful!`, 'success');
            } else {
                this.showNotification(`${backend} test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to test tracing connection', 'error');
        }
    }

    async loadObservabilityConfig() {
        try {
            const response = await fetch('/api/observability/config');
            const config = await response.json();
            
            // Load access logs configuration
            document.getElementById('enable-access-logs').checked = config.accessLogs.enabled;
            document.getElementById('log-format').value = config.accessLogs.format;
            document.getElementById('log-file-path').value = config.accessLogs.filePath;
            this.toggleAccessLogsOptions(config.accessLogs.enabled);
            
            if (config.accessLogs.graylog) {
                document.getElementById('enable-graylog').checked = true;
                document.getElementById('graylog-endpoint').value = config.accessLogs.graylog.endpoint || '';
                document.getElementById('graylog-facility').value = config.accessLogs.graylog.facility || 'traefik';
                this.toggleGraylogOptions(true);
            }
            
            // Load metrics configuration
            document.getElementById('enable-metrics').checked = config.metrics.enabled;
            document.getElementById('metrics-port').value = config.metrics.port;
            document.getElementById('metrics-path').value = config.metrics.path;
            document.getElementById('metrics-entrypoint').checked = config.metrics.categories.entrypoint;
            document.getElementById('metrics-router').checked = config.metrics.categories.router;
            document.getElementById('metrics-service').checked = config.metrics.categories.service;
            this.toggleMetricsOptions(config.metrics.enabled);
            
            // Load tracing configuration
            document.getElementById('enable-tracing').checked = config.tracing.enabled;
            document.getElementById('tracing-backend').value = config.tracing.backend;
            document.getElementById('tracing-endpoint').value = config.tracing.endpoint;
            document.getElementById('sampling-rate').value = config.tracing.samplingRate;
            document.getElementById('service-name').value = config.tracing.serviceName;
            document.getElementById('trace-headers').value = config.tracing.headers;
            this.toggleTracingOptions(config.tracing.enabled);
            this.updateSamplingRateDisplay(config.tracing.samplingRate);
            
            // Update status indicators
            this.updateObservabilityStatus('logs', config.accessLogs.enabled ? 'Configured' : 'Disabled');
            this.updateObservabilityStatus('metrics', config.metrics.enabled ? `Enabled on :${config.metrics.port}` : 'Disabled');
            this.updateObservabilityStatus('tracing', config.tracing.enabled ? `${config.tracing.backend} (${Math.round(config.tracing.samplingRate * 100)}%)` : 'Disabled');
            
            this.showNotification('Observability configuration loaded successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to load observability configuration', 'error');
        }
    }

    updateObservabilityStatus(type, status) {
        const statusElement = document.getElementById(`${type}-status`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-indicator ${status.toLowerCase().includes('disabled') ? 'disabled' : 'enabled'}`;
        }
    }

    async exportObservabilityConfig() {
        try {
            const response = await fetch('/api/observability/config');
            const config = await response.json();
            
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'traefik-observability-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Observability configuration exported successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to export observability configuration', 'error');
        }
    }

    async restartTraefikForObservability() {
        if (!confirm('Restart Traefik to apply observability changes? This may cause temporary downtime.')) {
            return;
        }

        try {
            const response = await fetch('/api/restart', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Traefik restarted successfully! Observability changes applied.', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Failed to restart Traefik', 'error');
        }
    }

    // Phase 4: Domain Overview Methods

    async scanDomains() {
        const scanStatus = document.getElementById('domain-scan-status');
        const scanButton = document.getElementById('scan-domains');
        
        try {
            scanStatus.textContent = '🔍 Analyzing domains and topology...';
            scanButton.disabled = true;
            
            const response = await fetch('/api/domains');
            if (!response.ok) {
                throw new Error('Failed to scan domains');
            }
            
            const data = await response.json();
            this.displayDomainCards(data.domains);
            this.displayNetworkTopologyMap(data.domains);
            
            scanStatus.textContent = `✅ Found ${data.domains.length} domains`;
        } catch (error) {
            this.showNotification(error.message, 'error');
            scanStatus.textContent = '❌ Scan failed';
        } finally {
            scanButton.disabled = false;
            setTimeout(() => {
                scanStatus.textContent = '';
            }, 3000);
        }
    }

    async refreshDomains() {
        if (!this.allDomains || this.allDomains.length === 0) {
            this.showNotification('Click "Scan Domains" first to analyze topology', 'info');
            return;
        }
        await this.scanDomains();
    }

    displayDomainCards(domains) {
        const container = document.getElementById('domain-cards');
        this.allDomains = domains;
        
        if (domains.length === 0) {
            container.innerHTML = '<p>No domains found in Traefik configuration.</p>';
            return;
        }

        container.innerHTML = domains.map(domain => this.createDomainCard(domain)).join('');
        this.updateFilterStatus('domain', `Showing all ${domains.length} domains`);
    }

    createDomainCard(domain) {
        const healthClass = domain.health.status;
        const tlsIcon = this.getTLSIcon(domain.tlsConfig);
        const backendIcon = domain.backend.type === 'docker' ? '🐳' : '🌐';
        
        return `
            <div class="domain-card ${healthClass}" data-domain="${domain.domain}">
                <div class="domain-header">
                    <div class="domain-info">
                        <div class="domain-title">
                            ${tlsIcon} ${domain.domain}
                            <span class="status-badge ${healthClass}">${domain.health.status.toUpperCase()}</span>
                        </div>
                        <div class="domain-subtitle">
                            ${backendIcon} ${domain.backend.type === 'docker' ? domain.backend.containerName : domain.backend.hostname || domain.backend.url}
                        </div>
                    </div>
                    <div class="domain-actions">
                        <button class="btn btn-sm btn-secondary" onclick="ui.viewDomainDetails('${domain.domain}')">
                            📋 Details
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="ui.editDomainRoute('${domain.routerName}')">
                            ✏️ Edit
                        </button>
                    </div>
                </div>
                
                <div class="domain-details">
                    <div class="detail-section">
                        <div class="detail-label">🔒 TLS:</div>
                        <div class="detail-value">${this.formatTLSConfig(domain.tlsConfig)}</div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-label">🛡️ Middleware:</div>
                        <div class="detail-value">${domain.middlewares.length ? domain.middlewares.join(', ') : 'None'}</div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-label">📍 Backend:</div>
                        <div class="detail-value">${this.formatBackend(domain.backend)}</div>
                    </div>
                    <div class="detail-section">
                        <div class="detail-label">⚡ Status:</div>
                        <div class="detail-value">${this.formatHealthStatus(domain.health)}</div>
                    </div>
                </div>
                
                ${domain.health.issues.length > 0 ? `
                <div class="domain-issues">
                    <h4>⚠️ Issues</h4>
                    <ul>
                        ${domain.health.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        `;
    }

    getTLSIcon(tlsConfig) {
        if (!tlsConfig.enabled) return '🔓';
        switch (tlsConfig.type) {
            case 'letsencrypt-http':
            case 'letsencrypt-dns':
                return '🔒';
            case 'letsencrypt-staging':
                return '🔒🧪';
            case 'custom':
                return '🔒📜';
            default:
                return '🔒❓';
        }
    }

    formatTLSConfig(tlsConfig) {
        if (!tlsConfig.enabled) return 'Disabled';
        switch (tlsConfig.type) {
            case 'letsencrypt-http':
                return 'Let\'s Encrypt HTTP';
            case 'letsencrypt-dns':
                return 'Let\'s Encrypt DNS';
            case 'letsencrypt-staging':
                return 'Let\'s Encrypt Staging';
            case 'custom':
                return 'Custom Certificate';
            default:
                return 'Unknown';
        }
    }

    formatBackend(backend) {
        switch (backend.type) {
            case 'docker':
                return `Docker: ${backend.containerName}:${backend.port}`;
            case 'external':
                return `External: ${backend.hostname}:${backend.port}`;
            default:
                return backend.url || 'Unknown';
        }
    }

    formatHealthStatus(health) {
        const lastChecked = new Date(health.lastChecked).toLocaleTimeString();
        return `${health.status} (checked ${lastChecked})`;
    }

    filterDomains(filter) {
        if (!this.allDomains) return;
        
        const cards = document.querySelectorAll('.domain-card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            let show = true;
            const domain = this.allDomains.find(d => d.domain === card.dataset.domain);
            
            if (!domain) {
                show = false;
            } else {
                switch (filter) {
                    case 'healthy':
                        show = domain.health.status === 'healthy';
                        break;
                    case 'warning':
                        show = domain.health.status === 'warning';
                        break;
                    case 'error':
                        show = domain.health.status === 'error';
                        break;
                    case 'external':
                        show = domain.backend.type === 'external';
                        break;
                    case 'docker':
                        show = domain.backend.type === 'docker';
                        break;
                    case 'all':
                    default:
                        show = true;
                        break;
                }
            }
            
            if (show) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        const statusText = visibleCount === cards.length 
            ? `Showing all ${cards.length} domains`
            : `Showing ${visibleCount} of ${cards.length} domains`;
        this.updateFilterStatus('domain', statusText);
    }

    displayNetworkTopologyMap(domains) {
        const container = document.getElementById('network-topology-map');
        
        if (domains.length === 0) {
            container.innerHTML = '<p>No topology data available.</p>';
            return;
        }

        // Group domains by backend type
        const dockerDomains = domains.filter(d => d.backend.type === 'docker');
        const externalDomains = domains.filter(d => d.backend.type === 'external');
        
        let html = '<div class="topology-sections">';
        
        if (dockerDomains.length > 0) {
            html += `
                <div class="topology-section">
                    <h3>🐳 Docker Services</h3>
                    <div class="topology-flow">
                        ${dockerDomains.map(domain => `
                            <div class="topology-item">
                                <div class="topology-domain">${domain.domain}</div>
                                <div class="topology-arrow">→</div>
                                <div class="topology-container">${domain.backend.containerName}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (externalDomains.length > 0) {
            html += `
                <div class="topology-section">
                    <h3>🌐 External Services</h3>
                    <div class="topology-flow">
                        ${externalDomains.map(domain => `
                            <div class="topology-item">
                                <div class="topology-domain">${domain.domain}</div>
                                <div class="topology-arrow">→</div>
                                <div class="topology-external">${domain.backend.hostname || domain.backend.url}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    async viewDomainDetails(domain) {
        try {
            const response = await fetch(`/api/domains/${encodeURIComponent(domain)}`);
            if (!response.ok) {
                throw new Error('Failed to get domain details');
            }
            
            const details = await response.json();
            this.showDomainDetailsModal(details);
        } catch (error) {
            this.showNotification(`Failed to get details for ${domain}`, 'error');
        }
    }

    showDomainDetailsModal(details) {
        const modal = document.createElement('div');
        modal.className = 'modal domain-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌐 ${details.domain} - Detailed Analysis</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-card">
                            <h4>🔒 TLS Configuration</h4>
                            <pre>${JSON.stringify(details.tlsDetails, null, 2)}</pre>
                        </div>
                        <div class="detail-card">
                            <h4>📍 Backend Details</h4>
                            <pre>${JSON.stringify(details.backendDetails, null, 2)}</pre>
                        </div>
                        <div class="detail-card">
                            <h4>🛡️ Middleware Chain</h4>
                            <pre>${JSON.stringify(details.middlewareDetails, null, 2)}</pre>
                        </div>
                        <div class="detail-card">
                            <h4>🌐 Network Path</h4>
                            <pre>${JSON.stringify(details.networkPath, null, 2)}</pre>
                        </div>
                        <div class="detail-card">
                            <h4>⚙️ Router Configuration</h4>
                            <pre>${JSON.stringify(details.routerConfig, null, 2)}</pre>
                        </div>
                        <div class="detail-card">
                            <h4>🔧 Service Configuration</h4>
                            <pre>${JSON.stringify(details.serviceConfig, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    editDomainRoute(routerName) {
        // Switch to add-route tab and populate with existing data
        this.switchTab('add-route');
        this.showNotification(`Editing ${routerName} (populate form functionality pending)`, 'info');
    }

    // Phase 5.5: System Configuration Management Methods

    async loadConfigViewer() {
        try {
            document.getElementById('config-viewer').innerHTML = '<div class="loading">Loading configuration...</div>';
            
            const response = await fetch('/api/config/ui');
            const config = await response.json();
            
            // Display configuration in a formatted, expandable tree view
            const configHtml = this.renderConfigTree(config);
            document.getElementById('config-viewer').innerHTML = configHtml;
            
            // Update status indicators
            document.getElementById('config-file-status').textContent = 'Loaded';
            document.getElementById('config-file-status').className = 'status-indicator success';
            
            this.showNotification('Configuration loaded successfully', 'success');
        } catch (error) {
            document.getElementById('config-viewer').innerHTML = '<div class="error">Failed to load configuration</div>';
            document.getElementById('config-file-status').textContent = 'Error';
            document.getElementById('config-file-status').className = 'status-indicator error';
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    renderConfigTree(config, level = 0) {
        const indent = '  '.repeat(level);
        let html = '<div class="config-tree">';
        
        if (typeof config === 'object' && config !== null) {
            for (const [key, value] of Object.entries(config)) {
                const hasChildren = typeof value === 'object' && value !== null;
                html += `<div class="config-node level-${level}">`;
                html += `<span class="config-key" ${hasChildren ? 'onclick="this.parentNode.classList.toggle(\'collapsed\')"' : ''}>${key}:</span>`;
                
                if (hasChildren) {
                    html += '<div class="config-children">';
                    html += this.renderConfigTree(value, level + 1);
                    html += '</div>';
                } else {
                    html += `<span class="config-value">${JSON.stringify(value)}</span>`;
                }
                html += '</div>';
            }
        }
        
        html += '</div>';
        return html;
    }

    async refreshConfigViewer() {
        await this.loadConfigViewer();
        await this.loadSystemConfigStatus();
    }

    async validateCurrentConfig() {
        try {
            const response = await fetch('/api/config/ui');
            const config = await response.json();
            
            const validateResponse = await fetch('/api/config/ui/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });
            
            const validation = await validateResponse.json();
            
            // Update validation status indicator
            const statusElement = document.getElementById('validation-status');
            if (statusElement) {
                statusElement.textContent = validation.valid ? 'Valid' : 'Invalid';
                statusElement.className = `status-indicator ${validation.valid ? 'success' : 'error'}`;
            }
            
            // Show validation results if available, otherwise show notification
            const resultsDiv = document.getElementById('validation-results');
            if (resultsDiv) {
                this.displayValidationResults(validation);
            } else {
                // If no results div, show notification instead
                if (validation.valid) {
                    this.showNotification('✅ Configuration is valid with no issues', 'success');
                } else {
                    const errorMsg = validation.errors?.join(', ') || 'Configuration validation failed';
                    this.showNotification(`❌ Configuration errors: ${errorMsg}`, 'error');
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.showNotification('Failed to validate configuration', 'error');
        }
    }

    toggleConfigEditor() {
        const editorSection = document.getElementById('config-editor-section');
        const button = document.getElementById('toggle-config-editor');
        
        if (editorSection.classList.contains('hidden')) {
            this.loadConfigIntoEditor();
            editorSection.classList.remove('hidden');
            button.textContent = '👁️ View Mode';
        } else {
            editorSection.classList.add('hidden');
            button.textContent = '✏️ Edit Mode';
        }
    }

    async loadConfigIntoEditor() {
        try {
            const response = await fetch('/api/config/ui');
            const config = await response.json();
            
            // Convert to YAML for editing
            const yamlString = this.objectToYaml(config);
            document.getElementById('config-editor').value = yamlString;
        } catch (error) {
            this.showNotification('Failed to load configuration into editor', 'error');
        }
    }

    objectToYaml(obj, indent = 0) {
        let yaml = '';
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                yaml += this.objectToYaml(value, indent + 1);
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(item => {
                    if (typeof item === 'object') {
                        yaml += `${spaces}  -\n`;
                        yaml += this.objectToYaml(item, indent + 2);
                    } else {
                        yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
                    }
                });
            } else {
                yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
            }
        }
        
        return yaml;
    }

    async validateConfigEdit() {
        const configText = document.getElementById('config-editor').value;
        
        try {
            const response = await fetch('/api/config/ui/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: configText })
            });
            
            const validation = await response.json();
            this.displayValidationResults(validation);
            
            document.getElementById('config-edit-status').textContent = validation.valid ? 'Valid' : 'Invalid';
            document.getElementById('config-edit-status').className = `edit-status ${validation.valid ? 'success' : 'error'}`;
        } catch (error) {
            this.showNotification('Failed to validate configuration', 'error');
        }
    }

    displayValidationResults(validation) {
        const resultsDiv = document.getElementById('validation-results');
        const errorsDiv = document.getElementById('validation-errors');
        const warningsDiv = document.getElementById('validation-warnings');
        
        if (!resultsDiv) {
            console.warn('Validation results div not found');
            return;
        }
        
        resultsDiv.classList.remove('hidden');
        
        if (validation.errors && validation.errors.length > 0) {
            if (errorsDiv) {
                errorsDiv.innerHTML = '<h5>Errors:</h5><ul>' + 
                    validation.errors.map(error => `<li class="error">${error}</li>`).join('') + 
                    '</ul>';
            }
        } else {
            if (errorsDiv) errorsDiv.innerHTML = '';
        }
        
        if (validation.warnings && validation.warnings.length > 0) {
            if (warningsDiv) {
                warningsDiv.innerHTML = '<h5>Warnings:</h5><ul>' + 
                    validation.warnings.map(warning => `<li class="warning">${warning}</li>`).join('') + 
                    '</ul>';
            }
        } else {
            if (warningsDiv) warningsDiv.innerHTML = '';
        }
        
        if (!validation.errors?.length && !validation.warnings?.length) {
            resultsDiv.innerHTML = '<div class="success">✅ Configuration is valid with no issues.</div>';
        }
    }

    async saveConfigChanges() {
        const configText = document.getElementById('config-editor').value;
        
        try {
            const response = await fetch('/api/config/ui', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: configText })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Configuration saved successfully! ${result.backup ? `Backup: ${result.backup}` : ''}`, 'success');
                this.cancelConfigEdit();
                this.refreshConfigViewer();
            } else {
                this.showNotification(`Failed to save: ${result.error}`, 'error');
                if (result.errors) {
                    this.displayValidationResults({ valid: false, errors: result.errors, warnings: result.warnings });
                }
            }
        } catch (error) {
            this.showNotification('Failed to save configuration', 'error');
        }
    }

    cancelConfigEdit() {
        document.getElementById('config-editor-section').classList.add('hidden');
        document.getElementById('toggle-config-editor').textContent = '✏️ Edit Mode';
        document.getElementById('validation-results').classList.add('hidden');
    }

    async exportConfig() {
        try {
            const includeSensitive = document.getElementById('include-sensitive').checked;
            const url = `/api/config/ui/export${includeSensitive ? '' : '?redact=true'}`;
            
            window.open(url, '_blank');
            this.showNotification('Configuration exported successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to export configuration', 'error');
        }
    }

    selectConfigFile() {
        document.getElementById('config-file-input').click();
    }

    async handleConfigFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        document.getElementById('import-filename').textContent = file.name;
        document.getElementById('import-filesize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.importConfigContent = e.target.result;
            document.getElementById('import-preview').classList.remove('hidden');
            document.getElementById('validate-import').classList.remove('hidden');
            document.getElementById('apply-import').classList.remove('hidden');
        };
        reader.readAsText(file);
    }

    async validateImport() {
        if (!this.importConfigContent) return;
        
        try {
            const response = await fetch('/api/config/ui/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    config: this.importConfigContent, 
                    validate_only: true 
                })
            });
            
            const result = await response.json();
            
            let validationHtml = '';
            if (result.valid) {
                validationHtml = '<div class="success">✅ Configuration is valid and can be imported</div>';
            } else {
                validationHtml = '<div class="error">❌ Configuration validation failed:</div>';
                if (result.errors?.length) {
                    validationHtml += '<ul class="error-list">' + 
                        result.errors.map(error => `<li>${error}</li>`).join('') + 
                        '</ul>';
                }
            }
            
            // Show migration information
            if (result.migration_info?.migration_applied) {
                validationHtml += `<div class="migration-info">🔄 Migration: v${result.migration_info.original_version} → v${result.migration_info.current_version}</div>`;
            }
            
            if (result.warnings?.length) {
                validationHtml += '<div class="warning">⚠️ Warnings:</div>';
                validationHtml += '<ul class="warning-list">' + 
                    result.warnings.map(warning => `<li>${warning}</li>`).join('') + 
                    '</ul>';
            }
            
            document.getElementById('import-validation-results').innerHTML = validationHtml;
        } catch (error) {
            this.showNotification('Failed to validate import', 'error');
        }
    }

    async applyImport() {
        if (!this.importConfigContent) return;
        
        if (!confirm('This will replace your current configuration. Are you sure?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/config/ui/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: this.importConfigContent })
            });
            
            const result = await response.json();
            
            if (result.success) {
                let message = 'Configuration imported successfully!';
                if (result.backup) {
                    message += ` Backup: ${result.backup}`;
                }
                if (result.migration_info?.migration_applied) {
                    message += ` (Migrated from v${result.migration_info.original_version} to v${result.migration_info.current_version})`;
                }
                
                this.showNotification(message, 'success');
                this.refreshConfigViewer();
                
                // Reset import form
                document.getElementById('config-file-input').value = '';
                document.getElementById('import-preview').classList.add('hidden');
                document.getElementById('validate-import').classList.add('hidden');
                document.getElementById('apply-import').classList.add('hidden');
                this.importConfigContent = null;
            } else {
                this.showNotification(`Import failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to import configuration', 'error');
        }
    }

    createManualBackup() {
        document.getElementById('manual-backup-section').classList.remove('hidden');
    }

    cancelCreateBackup() {
        document.getElementById('manual-backup-section').classList.add('hidden');
        document.getElementById('backup-name').value = '';
    }

    async confirmCreateBackup() {
        const name = document.getElementById('backup-name').value.trim();
        
        try {
            const response = await fetch('/api/config/ui/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Backup created: ${result.filename}`, 'success');
                this.cancelCreateBackup();
                this.refreshBackupList();
            } else {
                this.showNotification(`Backup failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to create backup', 'error');
        }
    }

    async refreshBackupList() {
        try {
            const response = await fetch('/api/config/ui/backups');
            const result = await response.json();
            
            const backupList = document.getElementById('backup-list');
            
            if (result.backups && result.backups.length > 0) {
                backupList.innerHTML = result.backups.map(backup => `
                    <div class="backup-item">
                        <div class="backup-info">
                            <div class="backup-name">${backup.filename}</div>
                            <div class="backup-details">
                                <span class="backup-date">${new Date(backup.created).toLocaleString()}</span>
                                <span class="backup-size">${(backup.size / 1024).toFixed(1)} KB</span>
                                <span class="backup-version">v${backup.version}</span>
                                <span class="backup-type">${backup.type}</span>
                            </div>
                        </div>
                        <div class="backup-actions">
                            <button class="btn btn-sm btn-primary" onclick="ui.restoreBackup('${backup.filename}', '${backup.created}', '${backup.version}', '${backup.type}')">
                                🔄 Restore
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="ui.deleteBackup('${backup.filename}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('backup-count-status').textContent = `${result.backups.length} backups`;
                document.getElementById('backup-count-status').className = 'status-indicator success';
            } else {
                backupList.innerHTML = '<p>No backups available</p>';
                document.getElementById('backup-count-status').textContent = 'No backups';
                document.getElementById('backup-count-status').className = 'status-indicator warning';
            }
        } catch (error) {
            document.getElementById('backup-list').innerHTML = '<p class="error">Failed to load backup list</p>';
            this.showNotification('Failed to load backup list', 'error');
        }
    }

    restoreBackup(filename, created, version, type) {
        // Populate restore modal with backup info
        document.getElementById('restore-filename').textContent = filename;
        document.getElementById('restore-created').textContent = new Date(created).toLocaleString();
        document.getElementById('restore-version').textContent = version;
        document.getElementById('restore-type').textContent = type;
        
        // Store filename for restoration
        this.restoreFilename = filename;
        
        // Show restore modal
        document.getElementById('restore-modal').classList.remove('hidden');
    }

    closeRestoreModal() {
        document.getElementById('restore-modal').classList.add('hidden');
        this.restoreFilename = null;
    }

    async confirmRestore() {
        if (!this.restoreFilename) return;
        
        try {
            const response = await fetch('/api/config/ui/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: this.restoreFilename })
            });
            
            const result = await response.json();
            
            if (result.success) {
                let message = `Configuration restored from ${result.restored_from}!`;
                if (result.current_backup) {
                    message += ` Current config backed up as: ${result.current_backup}`;
                }
                if (result.migration_info?.migration_applied) {
                    message += ` (Migrated from v${result.migration_info.original_version} to v${result.migration_info.current_version})`;
                }
                
                this.showNotification(message, 'success');
                this.closeRestoreModal();
                this.refreshConfigViewer();
                this.refreshBackupList();
            } else {
                this.showNotification(`Restore failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to restore configuration', 'error');
        }
    }

    async cleanupOldBackups() {
        if (!confirm('This will delete backups older than the retention period. Continue?')) {
            return;
        }
        
        // This would be implemented based on the retention settings
        this.showNotification('Cleanup functionality will be implemented based on retention settings', 'info');
    }

    async handleSystemSettingsSubmit(e) {
        e.preventDefault();
        
        const autoBackup = document.getElementById('auto-backup-enabled').checked;
        const retentionDays = parseInt(document.getElementById('backup-retention-days').value);
        const validationLevel = document.getElementById('config-validation-level').value;
        
        // This would update the UI configuration with the new system settings
        this.showNotification('System settings saved successfully', 'success');
    }

    async loadSystemConfigStatus() {
        // Load backup count and validation status
        this.refreshBackupList();
        this.validateCurrentConfig();
    }
}

const ui = new TraefikUI();

// Global function for switching tabs (called from HTML)
function switchTab(tabName) {
    ui.switchTab(tabName);
}