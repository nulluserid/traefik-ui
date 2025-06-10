/**
 * Traefik UI - Observability Module
 * Handles domain overview, health monitoring, logging, metrics, and tracing
 * Version: 0.0.6
 */

class TraefikObservability {
    
    constructor(mainUI) {
        this.ui = mainUI;
        this.domains = [];
        this.config = {};
        this.presets = this.initializePresets();
    }

    /**
     * Observability Presets
     */
    initializePresets() {
        return {
            production: {
                name: 'Production',
                description: 'JSON logs, full metrics, Jaeger tracing with 10% sampling',
                accessLogs: {
                    enabled: true,
                    format: 'json',
                    filePath: '/logs/access.log',
                    graylog: {
                        enabled: false,
                        endpoint: '',
                        facility: 'traefik'
                    }
                },
                metrics: {
                    enabled: true,
                    port: '8082',
                    path: '/metrics',
                    categories: {
                        entrypoint: true,
                        router: true,
                        service: true
                    }
                },
                tracing: {
                    enabled: true,
                    backend: 'jaeger',
                    endpoint: 'http://jaeger:14268/api/traces',
                    samplingRate: 0.1,
                    serviceName: 'traefik',
                    headers: ''
                }
            },
            development: {
                name: 'Development',
                description: 'CLF logs, basic metrics, no tracing for minimal overhead',
                accessLogs: {
                    enabled: true,
                    format: 'clf',
                    filePath: '/logs/access.log',
                    graylog: {
                        enabled: false,
                        endpoint: '',
                        facility: 'traefik'
                    }
                },
                metrics: {
                    enabled: true,
                    port: '8082',
                    path: '/metrics',
                    categories: {
                        entrypoint: true,
                        router: false,
                        service: false
                    }
                },
                tracing: {
                    enabled: false,
                    backend: 'jaeger',
                    endpoint: '',
                    samplingRate: 0.0,
                    serviceName: 'traefik',
                    headers: ''
                }
            },
            minimal: {
                name: 'Minimal',
                description: 'All observability disabled for maximum performance',
                accessLogs: {
                    enabled: false,
                    format: 'clf',
                    filePath: '/logs/access.log',
                    graylog: {
                        enabled: false,
                        endpoint: '',
                        facility: 'traefik'
                    }
                },
                metrics: {
                    enabled: false,
                    port: '8082',
                    path: '/metrics',
                    categories: {
                        entrypoint: false,
                        router: false,
                        service: false
                    }
                },
                tracing: {
                    enabled: false,
                    backend: 'jaeger',
                    endpoint: '',
                    samplingRate: 0.0,
                    serviceName: 'traefik',
                    headers: ''
                }
            }
        };
    }

    /**
     * Domain Overview and Health Monitoring
     */
    async scanDomains() {
        const scanStatus = TraefikUtils.getElement('domain-scan-status');
        const scanButton = TraefikUtils.getElement('scan-domains');
        
        try {
            if (scanStatus) scanStatus.textContent = '🔍 Scanning domains and services...';
            if (scanButton) scanButton.disabled = true;
            
            const domains = await TraefikUtils.apiRequest('/api/domains');
            this.domains = domains;
            this.displayDomainOverview(domains);
            
            if (scanStatus) scanStatus.textContent = `✅ Found ${domains.length} domains`;
            
        } catch (error) {
            console.error('Failed to scan domains:', error);
            if (scanStatus) scanStatus.textContent = '❌ Failed to scan domains';
            TraefikUtils.showNotification(error.message, 'error');
        } finally {
            if (scanButton) scanButton.disabled = false;
        }
    }

    async refreshDomains() {
        await this.scanDomains();
    }

    displayDomainOverview(domains) {
        const container = TraefikUtils.getElement('domains-overview');
        if (!container) return;
        
        if (domains.length === 0) {
            container.innerHTML = '<p>No domains configured.</p>';
            return;
        }

        container.innerHTML = domains.map(domain => this.createDomainCard(domain)).join('');
    }

    createDomainCard(domain) {
        const statusClass = this.getDomainStatusClass(domain.health);
        const tlsInfo = this.formatTLSInfo(domain.tls);
        const backendInfo = this.formatBackendInfo(domain.backend);
        
        return `
            <div class="domain-card ${statusClass}" data-domain="${domain.name}">
                <div class="domain-header">
                    <div class="domain-info">
                        <h3 class="domain-name">🌐 ${domain.name}</h3>
                        <div class="domain-subtitle">${domain.service}</div>
                    </div>
                    <div class="domain-status">
                        ${TraefikUtils.createStatusBadge(domain.health.status, domain.health.status.toUpperCase()).outerHTML}
                    </div>
                </div>
                
                <div class="domain-details">
                    <div class="detail-row">
                        <span class="detail-label">🔒 TLS:</span>
                        <span class="detail-value">${tlsInfo}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📍 Backend:</span>
                        <span class="detail-value">${backendInfo}</span>
                    </div>
                    ${domain.middleware.length > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">🛡️ Middleware:</span>
                        <span class="detail-value">${domain.middleware.join(', ')}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">⚡ Performance:</span>
                        <span class="detail-value">${domain.health.responseTime || 'N/A'} | ${domain.health.uptime || 'N/A'} uptime</span>
                    </div>
                </div>
                
                <div class="domain-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.traefikUI.observability.viewDomainDetails('${domain.name}')">
                        📊 Details
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.traefikUI.observability.testDomain('${domain.name}')">
                        🔍 Test
                    </button>
                </div>
            </div>
        `;
    }

    getDomainStatusClass(health) {
        switch (health.status) {
            case 'healthy': return 'status-healthy';
            case 'warning': return 'status-warning';
            case 'unhealthy': return 'status-unhealthy';
            default: return 'status-unknown';
        }
    }

    formatTLSInfo(tls) {
        if (!tls.enabled) return 'None';
        
        let info = tls.type;
        if (tls.provider) info += ` (${tls.provider})`;
        if (tls.expiresAt) {
            const days = Math.ceil((new Date(tls.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
            if (days < 30) info += ` ⚠️ ${days}d`;
        }
        return info;
    }

    formatBackendInfo(backend) {
        if (backend.type === 'docker') {
            return `Docker → ${backend.container}:${backend.port}`;
        } else {
            return `External → ${backend.url}`;
        }
    }

    filterDomains(filter) {
        const cards = document.querySelectorAll('.domain-card');
        
        cards.forEach(card => {
            let show = true;
            
            switch (filter) {
                case 'healthy':
                    show = card.classList.contains('status-healthy');
                    break;
                case 'warning':
                    show = card.classList.contains('status-warning');
                    break;
                case 'unhealthy':
                    show = card.classList.contains('status-unhealthy');
                    break;
                case 'tls-enabled':
                    show = card.textContent.includes('Let\'s Encrypt') || card.textContent.includes('Custom');
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    async viewDomainDetails(domainName) {
        try {
            const details = await TraefikUtils.apiRequest(`/api/domains/${domainName}`);
            this.showDomainDetailsModal(details);
        } catch (error) {
            TraefikUtils.showNotification('Failed to load domain details', 'error');
        }
    }

    showDomainDetailsModal(details) {
        const modal = document.createElement('div');
        modal.className = 'modal domain-details-modal';
        modal.innerHTML = this.buildDomainDetailsModal(details);
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Close handlers
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    buildDomainDetailsModal(details) {
        return `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3>Domain Details: ${details.name}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="domain-detail-tabs">
                        <div class="tab-buttons">
                            <button class="tab-btn active" data-tab="overview">Overview</button>
                            <button class="tab-btn" data-tab="configuration">Configuration</button>
                            <button class="tab-btn" data-tab="health">Health</button>
                            <button class="tab-btn" data-tab="traces">Traces</button>
                        </div>
                        
                        <div class="tab-content active" id="overview">
                            ${this.buildOverviewTab(details)}
                        </div>
                        
                        <div class="tab-content" id="configuration">
                            ${this.buildConfigurationTab(details)}
                        </div>
                        
                        <div class="tab-content" id="health">
                            ${this.buildHealthTab(details)}
                        </div>
                        
                        <div class="tab-content" id="traces">
                            ${this.buildTracesTab(details)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    buildOverviewTab(details) {
        return `
            <div class="overview-grid">
                <div class="overview-section">
                    <h4>Routing Information</h4>
                    <table class="detail-table">
                        <tr><td>Domain</td><td>${details.name}</td></tr>
                        <tr><td>Rule</td><td>${details.rule}</td></tr>
                        <tr><td>Service</td><td>${details.service}</td></tr>
                        <tr><td>Entry Points</td><td>${details.entrypoints?.join(', ') || 'web'}</td></tr>
                    </table>
                </div>
                
                <div class="overview-section">
                    <h4>Backend Information</h4>
                    <table class="detail-table">
                        <tr><td>Type</td><td>${details.backend.type}</td></tr>
                        <tr><td>Target</td><td>${details.backend.url || details.backend.container}</td></tr>
                        <tr><td>Port</td><td>${details.backend.port}</td></tr>
                        <tr><td>Network</td><td>${details.backend.network || 'N/A'}</td></tr>
                    </table>
                </div>
            </div>
        `;
    }

    buildConfigurationTab(details) {
        const tlsConfig = details.tls || {};
        const middlewareList = details.middleware?.map(m => `<li>${m}</li>`).join('') || '<li>None configured</li>';
        
        return `
            <div class="config-sections">
                <div class="config-section">
                    <h4>TLS Configuration</h4>
                    <table class="detail-table">
                        <tr><td>Enabled</td><td>${tlsConfig.enabled ? 'Yes' : 'No'}</td></tr>
                        ${tlsConfig.enabled ? `
                        <tr><td>Type</td><td>${tlsConfig.type}</td></tr>
                        <tr><td>Provider</td><td>${tlsConfig.provider || 'N/A'}</td></tr>
                        <tr><td>Expires</td><td>${tlsConfig.expiresAt ? new Date(tlsConfig.expiresAt).toLocaleDateString() : 'N/A'}</td></tr>
                        ` : ''}
                    </table>
                </div>
                
                <div class="config-section">
                    <h4>Middleware</h4>
                    <ul class="middleware-list">
                        ${middlewareList}
                    </ul>
                </div>
            </div>
        `;
    }

    buildHealthTab(details) {
        const health = details.health || {};
        
        return `
            <div class="health-overview">
                <div class="health-status">
                    <h4>Current Status</h4>
                    ${TraefikUtils.createStatusBadge(health.status, health.status?.toUpperCase()).outerHTML}
                    <div class="status-details">
                        <p><strong>Response Time:</strong> ${health.responseTime || 'N/A'}</p>
                        <p><strong>Last Check:</strong> ${health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'N/A'}</p>
                        <p><strong>Uptime:</strong> ${health.uptime || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="health-metrics">
                    <h4>Performance Metrics</h4>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <span class="metric-label">Requests (24h)</span>
                            <span class="metric-value">${health.metrics?.requests24h || 'N/A'}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Error Rate</span>
                            <span class="metric-value">${health.metrics?.errorRate || 'N/A'}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Avg Response</span>
                            <span class="metric-value">${health.metrics?.avgResponse || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    buildTracesTab(details) {
        const traces = details.traces || [];
        
        if (traces.length === 0) {
            return '<p>No trace data available. Enable tracing in the Observability configuration.</p>';
        }
        
        return `
            <div class="traces-container">
                <h4>Recent Traces</h4>
                <div class="traces-list">
                    ${traces.map(trace => `
                        <div class="trace-item">
                            <div class="trace-header">
                                <span class="trace-id">${trace.id}</span>
                                <span class="trace-duration">${trace.duration}ms</span>
                                ${TraefikUtils.createStatusBadge(trace.status).outerHTML}
                            </div>
                            <div class="trace-details">
                                <div>Started: ${new Date(trace.timestamp).toLocaleString()}</div>
                                <div>Spans: ${trace.spans?.length || 0}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async testDomain(domainName) {
        try {
            TraefikUtils.showNotification(`Testing ${domainName}...`, 'info');
            const result = await TraefikUtils.apiRequest(`/api/domains/${domainName}/test`, {
                method: 'POST'
            });
            
            if (result.success) {
                TraefikUtils.showNotification(`${domainName} test successful! Response: ${result.responseTime}ms`, 'success');
            } else {
                TraefikUtils.showNotification(`${domainName} test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test domain', 'error');
        }
    }

    /**
     * Observability Configuration Management
     */
    async loadObservabilityConfig() {
        try {
            const config = await TraefikUtils.apiRequest('/api/observability/config');
            this.config = config;
            this.populateObservabilityForm(config);
            this.updateObservabilityStatus(config);
            return config;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load observability configuration', 'error');
            throw error;
        }
    }

    populateObservabilityForm(config) {
        // Access Logs
        const enableLogs = TraefikUtils.getElement('enable-access-logs');
        if (enableLogs) {
            enableLogs.checked = config.accessLogs.enabled;
            this.ui.toggleAccessLogsOptions(config.accessLogs.enabled);
        }
        
        TraefikUtils.getElement('log-format', false)?.setAttribute('value', config.accessLogs.format);
        TraefikUtils.getElement('log-file-path', false)?.setAttribute('value', config.accessLogs.filePath);
        
        if (config.accessLogs.graylog?.enabled) {
            const enableGraylog = TraefikUtils.getElement('enable-graylog');
            if (enableGraylog) {
                enableGraylog.checked = true;
                this.ui.toggleGraylogOptions(true);
            }
            
            TraefikUtils.getElement('graylog-endpoint', false)?.setAttribute('value', config.accessLogs.graylog.endpoint || '');
            TraefikUtils.getElement('graylog-facility', false)?.setAttribute('value', config.accessLogs.graylog.facility || 'traefik');
        }
        
        // Metrics
        const enableMetrics = TraefikUtils.getElement('enable-metrics');
        if (enableMetrics) {
            enableMetrics.checked = config.metrics.enabled;
            this.ui.toggleMetricsOptions(config.metrics.enabled);
        }
        
        TraefikUtils.getElement('metrics-port', false)?.setAttribute('value', config.metrics.port);
        TraefikUtils.getElement('metrics-path', false)?.setAttribute('value', config.metrics.path);
        
        // Metrics categories
        TraefikUtils.getElement('metrics-entrypoint', false)?.setAttribute('checked', config.metrics.categories.entrypoint);
        TraefikUtils.getElement('metrics-router', false)?.setAttribute('checked', config.metrics.categories.router);
        TraefikUtils.getElement('metrics-service', false)?.setAttribute('checked', config.metrics.categories.service);
        
        // Tracing
        const enableTracing = TraefikUtils.getElement('enable-tracing');
        if (enableTracing) {
            enableTracing.checked = config.tracing.enabled;
            this.ui.toggleTracingOptions(config.tracing.enabled);
        }
        
        TraefikUtils.getElement('tracing-backend', false)?.setAttribute('value', config.tracing.backend);
        TraefikUtils.getElement('tracing-endpoint', false)?.setAttribute('value', config.tracing.endpoint);
        TraefikUtils.getElement('sampling-rate', false)?.setAttribute('value', config.tracing.samplingRate);
        TraefikUtils.getElement('service-name', false)?.setAttribute('value', config.tracing.serviceName);
        TraefikUtils.getElement('trace-headers', false)?.setAttribute('value', config.tracing.headers);
    }

    updateObservabilityStatus(config) {
        this.updateStatusIndicator('logs', config.accessLogs.enabled ? 'Configured' : 'Disabled');
        this.updateStatusIndicator('metrics', config.metrics.enabled ? `Enabled on :${config.metrics.port}` : 'Disabled');
        this.updateStatusIndicator('tracing', config.tracing.enabled ? `${config.tracing.backend} (${Math.round(config.tracing.samplingRate * 100)}%)` : 'Disabled');
    }

    updateStatusIndicator(type, status) {
        const statusElement = TraefikUtils.getElement(`${type}-status`, false);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-indicator ${status.toLowerCase().includes('disabled') ? 'disabled' : 'enabled'}`;
        }
    }

    /**
     * Preset Management
     */
    async applyObservabilityPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            TraefikUtils.showNotification('Preset not found', 'error');
            return;
        }

        try {
            // Apply all configurations in parallel
            const promises = [
                this.applyAccessLogsConfig(preset.accessLogs),
                this.applyMetricsConfig(preset.metrics),
                this.applyTracingConfig(preset.tracing)
            ];
            
            await Promise.all(promises);
            
            // Update UI to reflect new configuration
            this.populateObservabilityForm(preset);
            this.updateObservabilityStatus(preset);
            
            TraefikUtils.showNotification(`${preset.name} preset applied successfully!`, 'success');
            
        } catch (error) {
            TraefikUtils.showNotification(`Failed to apply ${preset.name} preset`, 'error');
        }
    }

    async applyAccessLogsConfig(config) {
        return TraefikUtils.apiRequest('/api/observability/logs', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }

    async applyMetricsConfig(config) {
        return TraefikUtils.apiRequest('/api/observability/metrics', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }

    async applyTracingConfig(config) {
        return TraefikUtils.apiRequest('/api/observability/tracing', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }

    /**
     * Form Handlers
     */
    async handleAccessLogsSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            await this.applyAccessLogsConfig(formData);
            TraefikUtils.showNotification('Access logs configuration updated successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to update access logs configuration', 'error');
        }
    }

    async handleMetricsSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            await this.applyMetricsConfig(formData);
            TraefikUtils.showNotification('Metrics configuration updated successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to update metrics configuration', 'error');
        }
    }

    async handleTracingSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            await this.applyTracingConfig(formData);
            TraefikUtils.showNotification('Tracing configuration updated successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to update tracing configuration', 'error');
        }
    }

    /**
     * Testing Functions
     */
    async testLogConfiguration() {
        const graylogEnabled = TraefikUtils.getElement('enable-graylog')?.checked;
        const graylogEndpoint = TraefikUtils.getElement('graylog-endpoint')?.value;
        
        if (!graylogEnabled || !graylogEndpoint) {
            TraefikUtils.showNotification('No external log configuration to test', 'info');
            return;
        }

        try {
            const result = await TraefikUtils.apiRequest('/api/observability/test', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'graylog',
                    config: { endpoint: graylogEndpoint }
                })
            });
            
            if (result.success) {
                TraefikUtils.showNotification('Graylog configuration test successful!', 'success');
            } else {
                TraefikUtils.showNotification(`Graylog test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test log configuration', 'error');
        }
    }

    async testMetricsEndpoint() {
        const port = TraefikUtils.getElement('metrics-port')?.value || '8082';
        const path = TraefikUtils.getElement('metrics-path')?.value || '/metrics';
        
        try {
            const result = await TraefikUtils.apiRequest('/api/observability/test', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'metrics',
                    config: { port, path }
                })
            });
            
            if (result.success) {
                TraefikUtils.showNotification(`Metrics endpoint test successful: ${result.details.url}`, 'success');
            } else {
                TraefikUtils.showNotification(`Metrics test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test metrics endpoint', 'error');
        }
    }

    async testTracingConnection() {
        const backend = TraefikUtils.getElement('tracing-backend')?.value;
        const endpoint = TraefikUtils.getElement('tracing-endpoint')?.value;
        
        if (!endpoint) {
            TraefikUtils.showNotification('Please enter a tracing endpoint', 'error');
            return;
        }

        try {
            const result = await TraefikUtils.apiRequest('/api/observability/test', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'tracing',
                    config: { backend, endpoint }
                })
            });
            
            if (result.success) {
                TraefikUtils.showNotification(`${backend} connection test successful!`, 'success');
            } else {
                TraefikUtils.showNotification(`${backend} test failed: ${result.message}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test tracing connection', 'error');
        }
    }

    /**
     * Configuration Export/Import
     */
    async exportObservabilityConfig() {
        try {
            const config = await TraefikUtils.apiRequest('/api/observability/config');
            
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'traefik-observability-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            TraefikUtils.showNotification('Observability configuration exported successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to export observability configuration', 'error');
        }
    }
}

// Make available globally
window.TraefikObservability = TraefikObservability;