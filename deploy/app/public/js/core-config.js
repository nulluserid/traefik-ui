/**
 * Traefik UI - Core Configuration Module
 * Handles routes, services, DNS providers, TLS, middleware, and templates
 * Version: 0.0.6
 */

class TraefikCoreConfig {
    
    constructor(mainUI) {
        this.ui = mainUI;
        this.templates = this.initializeTemplates();
    }

    /**
     * Template System
     */
    initializeTemplates() {
        return {
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
            },
            'docker-service': {
                routeName: 'docker-app',
                hostname: 'docker.example.com',
                backendUrl: 'http://my-container:8080',
                enableTls: true,
                tlsMethod: 'letsencrypt'
            }
        };
    }

    /**
     * Configuration Loading
     */
    async loadConfig() {
        try {
            const data = await TraefikUtils.apiRequest('/api/config');
            this.displayRoutes(data.dynamic?.http?.routers || {});
            this.displayServices(data.dynamic?.http?.services || {});
            this.populateDNSProviderDropdown();
            return data;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load configuration', 'error');
            throw error;
        }
    }

    /**
     * Route Management
     */
    displayRoutes(routers) {
        const container = TraefikUtils.getElement('routes-list');
        if (!container) return;
        
        if (Object.keys(routers).length === 0) {
            container.innerHTML = '<p>No routes configured</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Route Name' },
            { key: 'rule', label: 'Rule' },
            { key: 'service', label: 'Service' },
            { key: 'tls', label: 'TLS', type: 'status', formatter: (value) => value ? 'enabled' : 'disabled' },
            { 
                key: 'actions', 
                label: 'Actions', 
                type: 'actions',
                actions: [
                    {
                        label: 'Delete',
                        type: 'danger',
                        handler: (item) => this.deleteRoute(item.name)
                    }
                ]
            }
        ];

        const data = Object.entries(routers).map(([name, config]) => ({
            name,
            rule: config.rule,
            service: config.service,
            tls: !!config.tls,
            middlewares: config.middlewares?.join(', ') || 'None'
        }));

        const table = TraefikUIComponents.createTable(headers, data);
        container.innerHTML = '';
        container.appendChild(table);
    }

    displayServices(services) {
        const container = TraefikUtils.getElement('services-list');
        if (!container) return;
        
        if (Object.keys(services).length === 0) {
            container.innerHTML = '<p>No services configured</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Service Name' },
            { key: 'servers', label: 'Backend Servers' },
            { key: 'healthCheck', label: 'Health Check', type: 'status' }
        ];

        const data = Object.entries(services).map(([name, config]) => ({
            name,
            servers: config.loadBalancer?.servers?.map(s => s.url).join(', ') || 'None',
            healthCheck: config.loadBalancer?.healthCheck ? 'enabled' : 'disabled'
        }));

        const table = TraefikUIComponents.createTable(headers, data);
        container.innerHTML = '';
        container.appendChild(table);
    }

    async handleRouteSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            const config = this.buildRouteConfig(formData);
            
            // Validate configuration
            this.validateRouteConfig(config);
            
            await this.createRoute(config);
            TraefikUtils.showNotification('Route created successfully!', 'success');
            e.target.reset();
            this.loadConfig();
            
        } catch (error) {
            TraefikUtils.showNotification(`Failed to create route: ${error.message}`, 'error');
        }
    }

    buildRouteConfig(formData) {
        const config = {
            name: formData.routeName,
            rule: `Host(\`${formData.hostname}\`)`,
            service: formData.routeName,
            serviceUrl: formData.backendUrl
        };

        // Add TLS configuration
        if (formData.enableTls) {
            config.tls = this.buildTlsConfig(
                formData.tlsMethod,
                formData.dnsProvider,
                formData.certChain,
                formData.privateKey,
                formData.hostname
            );
        }

        // Add middleware
        if (formData.enableCrowdsec && formData.middlewareName) {
            config.middleware = [formData.middlewareName];
        }

        // Add service options
        const serviceOptions = {};
        if (formData.ignoreTlsErrors) {
            serviceOptions.serversTransport = 'insecure@internal';
        }
        if (formData.healthCheck) {
            serviceOptions.healthCheck = { path: formData.healthCheckPath || '/health' };
        }
        config.serviceOptions = serviceOptions;

        return config;
    }

    buildTlsConfig(tlsMethod, dnsProvider, certChain, privateKey, hostname) {
        switch (tlsMethod) {
            case 'letsencrypt':
                return {
                    certResolver: 'letsencrypt',
                    domains: [{ main: hostname }]
                };
            
            case 'letsencrypt-staging':
                return {
                    certResolver: 'letsencrypt-staging',
                    domains: [{ main: hostname }]
                };
            
            case 'letsencrypt-dns':
                if (!dnsProvider) {
                    throw new Error('DNS provider required for DNS challenge');
                }
                return {
                    certResolver: `letsencrypt-dns-${dnsProvider}`,
                    domains: [{ main: hostname }]
                };
            
            case 'custom':
                if (!certChain || !privateKey) {
                    throw new Error('Certificate chain and private key required for custom certificates');
                }
                return { options: 'custom-tls@file' };
            
            default:
                return {};
        }
    }

    validateRouteConfig(config) {
        if (!config.name || !config.name.trim()) {
            throw new Error('Route name is required');
        }
        
        if (!config.serviceUrl || !TraefikUtils.validateURL(config.serviceUrl)) {
            throw new Error('Valid backend URL is required');
        }
        
        const hostname = config.rule.match(/Host\(\`([^`]+)\`\)/)?.[1];
        if (!hostname || !TraefikUtils.validateDomain(hostname)) {
            throw new Error('Valid hostname is required');
        }
    }

    async createRoute(config) {
        await TraefikUtils.apiRequest('/api/router', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    async deleteRoute(name) {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Are you sure you want to delete route "${name}"?`,
            'Delete Route'
        );
        
        if (!confirmed) return;

        try {
            await TraefikUtils.apiRequest(`/api/router/${name}`, { method: 'DELETE' });
            TraefikUtils.showNotification('Route deleted successfully!', 'success');
            this.loadConfig();
        } catch (error) {
            TraefikUtils.showNotification('Failed to delete route', 'error');
        }
    }

    /**
     * Template System
     */
    useTemplate(templateName) {
        this.ui.switchTab('add-route');
        
        const template = this.templates[templateName];
        if (!template) {
            TraefikUtils.showNotification('Template not found', 'error');
            return;
        }

        // Populate form fields
        Object.entries(template).forEach(([key, value]) => {
            const element = TraefikUtils.getElement(this.getFormFieldId(key), false);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Trigger form updates
        if (template.enableTls) {
            this.ui.toggleTLSOptions(true);
            if (template.tlsMethod) {
                this.ui.handleTLSMethodChange(template.tlsMethod);
            }
        }

        TraefikUtils.showNotification(`Template "${templateName}" applied`, 'success');
    }

    getFormFieldId(templateKey) {
        const fieldMapping = {
            routeName: 'route-name',
            hostname: 'hostname',
            backendUrl: 'backend-url',
            enableTls: 'enable-tls',
            tlsMethod: 'tls-method',
            ignoreTlsErrors: 'ignore-tls-errors'
        };
        return fieldMapping[templateKey] || templateKey;
    }

    /**
     * DNS Provider Management
     */
    async loadDNSProviders() {
        try {
            const data = await TraefikUtils.apiRequest('/api/dns-providers');
            this.displayDNSProviders(data.providers || []);
            this.populateDNSProviderDropdown(data.providers || []);
            return data.providers;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load DNS providers', 'error');
        }
    }

    displayDNSProviders(providers) {
        const container = TraefikUtils.getElement('dns-providers-list');
        if (!container) return;
        
        if (providers.length === 0) {
            container.innerHTML = '<p>No DNS providers configured</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Provider Name' },
            { key: 'nameserver', label: 'Nameserver' },
            { key: 'tsigKey', label: 'TSIG Key' },
            { key: 'algorithm', label: 'Algorithm' },
            { 
                key: 'actions', 
                label: 'Actions', 
                type: 'actions',
                actions: [
                    {
                        label: 'Test',
                        type: 'primary',
                        handler: (item) => this.testDNSProvider(item.name)
                    },
                    {
                        label: 'Delete',
                        type: 'danger',
                        handler: (item) => this.deleteDNSProvider(item.name)
                    }
                ]
            }
        ];

        const table = TraefikUIComponents.createTable(headers, providers);
        container.innerHTML = '';
        container.appendChild(table);
    }

    populateDNSProviderDropdown(providers = null) {
        const select = TraefikUtils.getElement('dns-provider', false);
        if (!select) return;

        if (!providers) {
            // Load providers if not provided
            this.loadDNSProviders().then(loadedProviders => {
                this.populateDNSProviderDropdown(loadedProviders);
            });
            return;
        }

        select.innerHTML = '<option value="">Select DNS Provider</option>';
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.name;
            option.textContent = `${provider.name} (${provider.nameserver})`;
            select.appendChild(option);
        });
    }

    async handleDNSProviderSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            
            await TraefikUtils.apiRequest('/api/dns-providers', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            TraefikUtils.showNotification('DNS provider created successfully!', 'success');
            e.target.reset();
            this.loadDNSProviders();
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to create DNS provider', 'error');
        }
    }

    async testDNSProvider(name) {
        try {
            TraefikUtils.showNotification('Testing DNS provider...', 'info');
            const result = await TraefikUtils.apiRequest(`/api/dns-providers/${name}/test`, {
                method: 'POST'
            });
            
            if (result.success) {
                TraefikUtils.showNotification('DNS provider test successful!', 'success');
            } else {
                TraefikUtils.showNotification(`DNS test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test DNS provider', 'error');
        }
    }

    async deleteDNSProvider(name) {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Are you sure you want to delete DNS provider "${name}"?`,
            'Delete DNS Provider'
        );
        
        if (!confirmed) return;

        try {
            await TraefikUtils.apiRequest(`/api/dns-providers/${name}`, { method: 'DELETE' });
            TraefikUtils.showNotification('DNS provider deleted successfully!', 'success');
            this.loadDNSProviders();
        } catch (error) {
            TraefikUtils.showNotification('Failed to delete DNS provider', 'error');
        }
    }

    /**
     * Middleware Management
     */
    async loadMiddleware() {
        try {
            const data = await TraefikUtils.apiRequest('/api/middleware');
            this.displayMiddleware(data.middlewares || {});
            return data.middlewares;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load middleware', 'error');
        }
    }

    displayMiddleware(middlewares) {
        const container = TraefikUtils.getElement('middleware-list');
        if (!container) return;
        
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
                        <button class="btn btn-danger btn-sm" onclick="window.traefikUI.core.deleteMiddleware('${name}')">Delete</button>
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
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            
            // Process trusted IPs
            if (formData.trustedIPs) {
                formData.trustedIPs = formData.trustedIPs
                    .split(',')
                    .map(ip => ip.trim())
                    .filter(ip => ip);
            }
            
            await TraefikUtils.apiRequest('/api/middleware/crowdsec', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            TraefikUtils.showNotification('CrowdSec middleware created successfully!', 'success');
            e.target.reset();
            this.loadMiddleware();
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to create CrowdSec middleware', 'error');
        }
    }

    async deleteMiddleware(name) {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Are you sure you want to delete middleware "${name}"?`,
            'Delete Middleware'
        );
        
        if (!confirmed) return;

        try {
            await TraefikUtils.apiRequest(`/api/middleware/${name}`, { method: 'DELETE' });
            TraefikUtils.showNotification('Middleware deleted successfully!', 'success');
            this.loadMiddleware();
        } catch (error) {
            TraefikUtils.showNotification('Failed to delete middleware', 'error');
        }
    }

    /**
     * System Management
     */
    async restartTraefik() {
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            'Are you sure you want to restart Traefik? This may cause temporary downtime.',
            'Restart Traefik'
        );
        
        if (!confirmed) return;

        try {
            const result = await TraefikUtils.apiRequest('/api/restart', { method: 'POST' });
            
            if (result.success) {
                TraefikUtils.showNotification('Traefik restarted successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to restart Traefik', 'error');
        }
    }

    /**
     * Label Generator
     */
    async generateLabels() {
        try {
            const form = TraefikUtils.getElement('label-generator-form');
            const formData = TraefikUtils.getFormData(form);
            
            const labels = this.buildDockerLabels(formData);
            const outputElement = TraefikUtils.getElement('generated-labels');
            
            outputElement.textContent = labels;
            outputElement.style.display = 'block';
            
            TraefikUtils.showNotification('Labels generated successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification(`Failed to generate labels: ${error.message}`, 'error');
        }
    }

    buildDockerLabels(formData) {
        let labels = [];
        
        // Basic labels
        labels.push(`traefik.enable=true`);
        labels.push(`traefik.http.routers.${formData.serviceName}.rule=Host(\`${formData.hostname}\`)`);
        labels.push(`traefik.http.routers.${formData.serviceName}.entrypoints=web`);
        
        if (formData.port) {
            labels.push(`traefik.http.services.${formData.serviceName}.loadbalancer.server.port=${formData.port}`);
        }
        
        // TLS configuration
        if (formData.enableTls) {
            labels.push(`traefik.http.routers.${formData.serviceName}.tls=true`);
            
            if (formData.tlsMethod === 'letsencrypt') {
                labels.push(`traefik.http.routers.${formData.serviceName}.tls.certresolver=letsencrypt`);
            } else if (formData.tlsMethod === 'letsencrypt-dns' && formData.dnsProvider) {
                labels.push(`traefik.http.routers.${formData.serviceName}.tls.certresolver=letsencrypt-dns-${formData.dnsProvider}`);
            }
        }
        
        // Middleware
        if (formData.enableCrowdsec && formData.middlewareName) {
            labels.push(`traefik.http.routers.${formData.serviceName}.middlewares=${formData.middlewareName}`);
        }
        
        return labels.map(label => `      - "${label}"`).join('\n');
    }

    async copyLabelsToClipboard() {
        const outputElement = TraefikUtils.getElement('generated-labels');
        if (outputElement.textContent) {
            await TraefikUtils.copyToClipboard(outputElement.textContent);
        } else {
            TraefikUtils.showNotification('No labels to copy', 'warning');
        }
    }
}

// Make available globally
window.TraefikCoreConfig = TraefikCoreConfig;