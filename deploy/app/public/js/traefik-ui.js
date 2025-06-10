/**
 * Traefik UI - Main Application Class
 * Orchestrates all modules and handles core UI functionality
 * Version: 0.6.5
 */

class TraefikUI {
    
    constructor() {
        this.core = null;
        this.network = null;
        this.observability = null;
        this.init();
    }

    /**
     * Application Initialization
     */
    init() {
        this.initTheme();
        this.initModules();
        this.setupEventListeners();
        this.loadInitialData();
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

    initModules() {
        // Initialize all modules with reference to main UI
        this.core = new TraefikCoreConfig(this);
        this.network = new TraefikNetworkManager(this);
        this.observability = new TraefikObservability(this);
        this.proxy = new TraefikProxyConfig(this);
        this.system = new TraefikSystemConfig(this);
        
        // Make modules globally accessible for onclick handlers
        window.traefikUI = {
            main: this,
            core: this.core,
            network: this.network,
            observability: this.observability,
            proxy: this.proxy,
            system: this.system
        };
    }

    /**
     * Event Listeners Setup
     */
    setupEventListeners() {
        // Core UI Event Listeners
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        const themeToggle = TraefikUtils.getElement('theme-toggle', false);
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const refreshBtn = TraefikUtils.getElement('refresh-btn', false);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAll());
        }

        // Core Configuration Event Listeners
        this.setupCoreEventListeners();
        
        // Network Management Event Listeners
        this.setupNetworkEventListeners();
        
        // Observability Event Listeners
        this.setupObservabilityEventListeners();
        
        // Proxy Configuration Event Listeners
        this.setupProxyEventListeners();
        
        // System Configuration Event Listeners
        this.setupSystemEventListeners();
    }

    setupCoreEventListeners() {
        // Route and service management
        const routeForm = TraefikUtils.getElement('route-form', false);
        if (routeForm) {
            routeForm.addEventListener('submit', (e) => this.core.handleRouteSubmit(e));
        }

        const crowdsecForm = TraefikUtils.getElement('crowdsec-form', false);
        if (crowdsecForm) {
            crowdsecForm.addEventListener('submit', (e) => this.core.handleCrowdSecSubmit(e));
        }

        const dnsProviderForm = TraefikUtils.getElement('dns-provider-form', false);
        if (dnsProviderForm) {
            dnsProviderForm.addEventListener('submit', (e) => this.core.handleDNSProviderSubmit(e));
        }

        // TLS and middleware toggles
        const enableTls = TraefikUtils.getElement('enable-tls', false);
        if (enableTls) {
            enableTls.addEventListener('change', (e) => this.toggleTLSOptions(e.target.checked));
        }

        const tlsMethod = TraefikUtils.getElement('tls-method', false);
        if (tlsMethod) {
            tlsMethod.addEventListener('change', (e) => this.handleTLSMethodChange(e.target.value));
        }

        const enableCrowdsec = TraefikUtils.getElement('enable-crowdsec', false);
        if (enableCrowdsec) {
            enableCrowdsec.addEventListener('change', (e) => this.toggleMiddlewareOptions(e.target.checked));
        }

        const restartBtn = TraefikUtils.getElement('restart-traefik', false);
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.core.restartTraefik());
        }

        // Label Generator Event Listeners
        const labelEnableTls = TraefikUtils.getElement('label-enable-tls', false);
        if (labelEnableTls) {
            labelEnableTls.addEventListener('change', (e) => this.toggleLabelTLSOptions(e.target.checked));
        }

        const labelTlsMethod = TraefikUtils.getElement('label-tls-method', false);
        if (labelTlsMethod) {
            labelTlsMethod.addEventListener('change', (e) => this.handleLabelTLSMethodChange(e.target.value));
        }

        const labelEnableCrowdsec = TraefikUtils.getElement('label-enable-crowdsec', false);
        if (labelEnableCrowdsec) {
            labelEnableCrowdsec.addEventListener('change', (e) => this.toggleLabelMiddlewareOptions(e.target.checked));
        }

        const generateLabels = TraefikUtils.getElement('generate-labels', false);
        if (generateLabels) {
            generateLabels.addEventListener('click', () => this.core.generateLabels());
        }

        const copyLabels = TraefikUtils.getElement('copy-labels', false);
        if (copyLabels) {
            copyLabels.addEventListener('click', () => this.core.copyLabelsToClipboard());
        }
    }

    setupNetworkEventListeners() {
        // Service Discovery Event Listeners
        const scanServices = TraefikUtils.getElement('scan-services', false);
        if (scanServices) {
            scanServices.addEventListener('click', () => this.network.scanDockerServices());
        }

        const refreshServices = TraefikUtils.getElement('refresh-services', false);
        if (refreshServices) {
            refreshServices.addEventListener('click', () => this.network.refreshServices());
        }

        const serviceFilter = TraefikUtils.getElement('service-filter', false);
        if (serviceFilter) {
            serviceFilter.addEventListener('change', (e) => this.network.filterServices(e.target.value));
        }

        // Service modal handlers
        const closeServiceModal = TraefikUtils.getElement('close-service-modal', false);
        if (closeServiceModal) {
            closeServiceModal.addEventListener('click', () => this.network.closeServiceModal());
        }

        const cancelEdit = TraefikUtils.getElement('cancel-edit', false);
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.network.closeServiceModal());
        }

        const serviceEditForm = TraefikUtils.getElement('service-edit-form', false);
        if (serviceEditForm) {
            serviceEditForm.addEventListener('submit', (e) => this.network.handleServiceEdit(e));
        }

        // Network Management Event Listeners
        const scanNetworks = TraefikUtils.getElement('scan-networks', false);
        if (scanNetworks) {
            scanNetworks.addEventListener('click', () => this.network.scanNetworks());
        }

        const refreshNetworks = TraefikUtils.getElement('refresh-networks', false);
        if (refreshNetworks) {
            refreshNetworks.addEventListener('click', () => this.network.refreshNetworks());
        }

        const networkFilter = TraefikUtils.getElement('network-filter', false);
        if (networkFilter) {
            networkFilter.addEventListener('change', (e) => this.network.filterNetworks(e.target.value));
        }

        // Network modal handlers
        const closeNetworkModal = TraefikUtils.getElement('close-network-modal', false);
        if (closeNetworkModal) {
            closeNetworkModal.addEventListener('click', () => this.network.closeNetworkModal());
        }

        const cancelNetworkConnect = TraefikUtils.getElement('cancel-network-connect', false);
        if (cancelNetworkConnect) {
            cancelNetworkConnect.addEventListener('click', () => this.network.closeNetworkModal());
        }

        const networkConnectForm = TraefikUtils.getElement('network-connect-form', false);
        if (networkConnectForm) {
            networkConnectForm.addEventListener('submit', (e) => this.network.handleNetworkConnect(e));
        }
    }

    setupObservabilityEventListeners() {
        // Domain Overview Event Listeners
        const scanDomains = TraefikUtils.getElement('scan-domains', false);
        if (scanDomains) {
            scanDomains.addEventListener('click', () => this.observability.scanDomains());
        }

        const refreshDomains = TraefikUtils.getElement('refresh-domains', false);
        if (refreshDomains) {
            refreshDomains.addEventListener('click', () => this.observability.refreshDomains());
        }

        const domainFilter = TraefikUtils.getElement('domain-filter', false);
        if (domainFilter) {
            domainFilter.addEventListener('change', (e) => this.observability.filterDomains(e.target.value));
        }

        // Observability Configuration Event Listeners
        const enableAccessLogs = TraefikUtils.getElement('enable-access-logs', false);
        if (enableAccessLogs) {
            enableAccessLogs.addEventListener('change', (e) => this.toggleAccessLogsOptions(e.target.checked));
        }

        const logFormat = TraefikUtils.getElement('log-format', false);
        if (logFormat) {
            logFormat.addEventListener('change', (e) => this.handleLogFormatChange(e.target.value));
        }

        const enableGraylog = TraefikUtils.getElement('enable-graylog', false);
        if (enableGraylog) {
            enableGraylog.addEventListener('change', (e) => this.toggleGraylogOptions(e.target.checked));
        }

        const enableMetrics = TraefikUtils.getElement('enable-metrics', false);
        if (enableMetrics) {
            enableMetrics.addEventListener('change', (e) => this.toggleMetricsOptions(e.target.checked));
        }

        const enableTracing = TraefikUtils.getElement('enable-tracing', false);
        if (enableTracing) {
            enableTracing.addEventListener('change', (e) => this.toggleTracingOptions(e.target.checked));
        }

        const tracingBackend = TraefikUtils.getElement('tracing-backend', false);
        if (tracingBackend) {
            tracingBackend.addEventListener('change', (e) => this.handleTracingBackendChange(e.target.value));
        }

        const samplingRate = TraefikUtils.getElement('sampling-rate', false);
        if (samplingRate) {
            samplingRate.addEventListener('input', (e) => this.updateSamplingRateDisplay(e.target.value));
        }

        // Preset buttons
        const presetButtons = ['production', 'development', 'minimal', 'custom'];
        presetButtons.forEach(preset => {
            const btn = TraefikUtils.getElement(`apply-${preset}-preset`, false);
            if (btn) {
                btn.addEventListener('click', () => this.observability.applyObservabilityPreset(preset));
            }
        });

        // Form handlers
        const accessLogsForm = TraefikUtils.getElement('access-logs-form', false);
        if (accessLogsForm) {
            accessLogsForm.addEventListener('submit', (e) => this.observability.handleAccessLogsSubmit(e));
        }

        const metricsForm = TraefikUtils.getElement('metrics-form', false);
        if (metricsForm) {
            metricsForm.addEventListener('submit', (e) => this.observability.handleMetricsSubmit(e));
        }

        const tracingForm = TraefikUtils.getElement('tracing-form', false);
        if (tracingForm) {
            tracingForm.addEventListener('submit', (e) => this.observability.handleTracingSubmit(e));
        }

        // Test buttons
        const testLogConfig = TraefikUtils.getElement('test-log-config', false);
        if (testLogConfig) {
            testLogConfig.addEventListener('click', () => this.observability.testLogConfiguration());
        }

        const testMetricsEndpoint = TraefikUtils.getElement('test-metrics-endpoint', false);
        if (testMetricsEndpoint) {
            testMetricsEndpoint.addEventListener('click', () => this.observability.testMetricsEndpoint());
        }

        const testTracingConnection = TraefikUtils.getElement('test-tracing-connection', false);
        if (testTracingConnection) {
            testTracingConnection.addEventListener('click', () => this.observability.testTracingConnection());
        }

        // Load/Export/Restart observability buttons
        const loadObservabilityConfig = TraefikUtils.getElement('load-observability-config', false);
        if (loadObservabilityConfig) {
            loadObservabilityConfig.addEventListener('click', () => this.observability.loadObservabilityConfig());
        }

        const exportObservabilityConfig = TraefikUtils.getElement('export-observability-config', false);
        if (exportObservabilityConfig) {
            exportObservabilityConfig.addEventListener('click', () => this.observability.exportObservabilityConfig());
        }

        const restartTraefikObservability = TraefikUtils.getElement('restart-traefik-observability', false);
        if (restartTraefikObservability) {
            restartTraefikObservability.addEventListener('click', () => this.observability.restartTraefikWithObservability());
        }
    }

    setupProxyEventListeners() {
        // Proxy Configuration Event Listeners
        const enableIpForwarding = TraefikUtils.getElement('enable-ip-forwarding', false);
        if (enableIpForwarding) {
            enableIpForwarding.addEventListener('change', (e) => this.proxy.toggleForwardingOptions(e.target.checked));
        }

        const enableRateLimiting = TraefikUtils.getElement('enable-rate-limiting', false);
        if (enableRateLimiting) {
            enableRateLimiting.addEventListener('change', (e) => this.proxy.toggleRateLimitOptions(e.target.checked));
        }

        const proxyConfigForm = TraefikUtils.getElement('proxy-config-form', false);
        if (proxyConfigForm) {
            proxyConfigForm.addEventListener('submit', (e) => this.proxy.handleProxyConfigSubmit(e));
        }

        const validateProxyConfig = TraefikUtils.getElement('validate-proxy-config', false);
        if (validateProxyConfig) {
            validateProxyConfig.addEventListener('click', () => this.proxy.validateProxyConfiguration());
        }

        const testIpForwarding = TraefikUtils.getElement('test-ip-forwarding', false);
        if (testIpForwarding) {
            testIpForwarding.addEventListener('click', () => this.proxy.testIPForwarding());
        }

        const exportProxyConfig = TraefikUtils.getElement('export-proxy-config', false);
        if (exportProxyConfig) {
            exportProxyConfig.addEventListener('click', () => this.proxy.exportProxyConfig());
        }
    }

    setupSystemEventListeners() {
        // System Config Event Listeners
        const loadConfigViewer = TraefikUtils.getElement('load-config-viewer', false);
        if (loadConfigViewer) {
            loadConfigViewer.addEventListener('click', () => this.system.loadConfigViewer());
        }

        const refreshConfigViewer = TraefikUtils.getElement('refresh-config-viewer', false);
        if (refreshConfigViewer) {
            refreshConfigViewer.addEventListener('click', () => this.system.refreshConfigViewer());
        }

        const validateCurrentConfig = TraefikUtils.getElement('validate-current-config', false);
        if (validateCurrentConfig) {
            validateCurrentConfig.addEventListener('click', () => this.system.validateCurrentConfig());
        }

        const toggleConfigEditor = TraefikUtils.getElement('toggle-config-editor', false);
        if (toggleConfigEditor) {
            toggleConfigEditor.addEventListener('click', () => this.system.toggleConfigEditor());
        }

        const saveConfigChanges = TraefikUtils.getElement('save-config-changes', false);
        if (saveConfigChanges) {
            saveConfigChanges.addEventListener('click', () => this.system.saveConfigChanges());
        }

        const cancelConfigEdit = TraefikUtils.getElement('cancel-config-edit', false);
        if (cancelConfigEdit) {
            cancelConfigEdit.addEventListener('click', () => this.system.cancelConfigEdit());
        }

        const validateConfigEdit = TraefikUtils.getElement('validate-config-edit', false);
        if (validateConfigEdit) {
            validateConfigEdit.addEventListener('click', () => this.system.validateConfigEdit());
        }

        const exportConfig = TraefikUtils.getElement('export-config', false);
        if (exportConfig) {
            exportConfig.addEventListener('click', () => this.system.exportConfig());
        }

        const selectConfigFile = TraefikUtils.getElement('select-config-file', false);
        if (selectConfigFile) {
            selectConfigFile.addEventListener('click', () => this.system.selectConfigFile());
        }

        const validateImport = TraefikUtils.getElement('validate-import', false);
        if (validateImport) {
            validateImport.addEventListener('click', () => this.system.validateImport());
        }

        const applyImport = TraefikUtils.getElement('apply-import', false);
        if (applyImport) {
            applyImport.addEventListener('click', () => this.system.applyImport());
        }

        const createManualBackup = TraefikUtils.getElement('create-manual-backup', false);
        if (createManualBackup) {
            createManualBackup.addEventListener('click', () => this.system.createManualBackup());
        }

        const refreshBackupList = TraefikUtils.getElement('refresh-backup-list', false);
        if (refreshBackupList) {
            refreshBackupList.addEventListener('click', () => this.system.refreshBackupList());
        }

        const confirmCreateBackup = TraefikUtils.getElement('confirm-create-backup', false);
        if (confirmCreateBackup) {
            confirmCreateBackup.addEventListener('click', () => this.system.confirmCreateBackup());
        }

        const cancelCreateBackup = TraefikUtils.getElement('cancel-create-backup', false);
        if (cancelCreateBackup) {
            cancelCreateBackup.addEventListener('click', () => this.system.cancelCreateBackup());
        }

        const systemSettingsForm = TraefikUtils.getElement('system-settings-form', false);
        if (systemSettingsForm) {
            systemSettingsForm.addEventListener('submit', (e) => this.system.handleSystemSettingsSubmit(e));
        }

        const configFileInput = TraefikUtils.getElement('config-file-input', false);
        if (configFileInput) {
            configFileInput.addEventListener('change', (e) => this.system.handleFileInputChange(e));
        }

        // Additional backup management buttons
        const downloadAllBackups = TraefikUtils.getElement('download-all-backups', false);
        if (downloadAllBackups) {
            downloadAllBackups.addEventListener('click', () => this.system.downloadAllBackups());
        }

        const cleanupOldBackups = TraefikUtils.getElement('cleanup-old-backups', false);
        if (cleanupOldBackups) {
            cleanupOldBackups.addEventListener('click', () => this.system.cleanupOldBackups());
        }

        // Restore modal handlers
        const closeRestoreModal = TraefikUtils.getElement('close-restore-modal', false);
        if (closeRestoreModal) {
            closeRestoreModal.addEventListener('click', () => this.system.closeRestoreModal());
        }

        const confirmRestore = TraefikUtils.getElement('confirm-restore', false);
        if (confirmRestore) {
            confirmRestore.addEventListener('click', () => this.system.confirmRestore());
        }

        const cancelRestore = TraefikUtils.getElement('cancel-restore', false);
        if (cancelRestore) {
            cancelRestore.addEventListener('click', () => this.system.cancelRestore());
        }
        
        // Template button event listeners
        this.setupTemplateEventListeners();
    }

    setupTemplateEventListeners() {
        // Route templates event listeners
        document.querySelectorAll('.template-card[data-template]').forEach(card => {
            const button = card.querySelector('button');
            if (button) {
                button.addEventListener('click', () => {
                    const templateName = card.dataset.template;
                    this.core.useTemplate(templateName);
                });
            }
        });

        // Label templates event listeners  
        document.querySelectorAll('.label-template-card[data-template]').forEach(card => {
            const button = card.querySelector('button');
            if (button) {
                button.addEventListener('click', () => {
                    const templateName = card.dataset.template;
                    this.useLabelTemplate(templateName);
                });
            }
        });
    }

    /**
     * Template Helpers
     */
    useLabelTemplate(templateName) {
        this.switchTab('label-generator');
        
        const templates = {
            'simple-web-app': {
                'label-service-name': 'webapp',
                'label-hostname': 'app.example.com',
                'label-port': '3000',
                'label-enable-tls': true,
                'label-tls-method': 'letsencrypt-http'
            },
            'api-service': {
                'label-service-name': 'api',
                'label-hostname': 'api.example.com',
                'label-port': '8080',
                'label-path': '/api',
                'label-enable-tls': true,
                'label-tls-method': 'letsencrypt-dns'
            },
            'protected-service': {
                'label-service-name': 'protected',
                'label-hostname': 'secure.example.com',
                'label-port': '3000',
                'label-enable-tls': true,
                'label-tls-method': 'letsencrypt-dns',
                'label-enable-crowdsec': true
            },
            'development-service': {
                'label-service-name': 'devapp',
                'label-hostname': 'dev.example.com',
                'label-port': '3000',
                'label-ignore-tls-errors': true
            }
        };
        
        const template = templates[templateName];
        if (!template) {
            TraefikUtils.showNotification('Template not found', 'error');
            return;
        }

        // Populate form fields
        Object.entries(template).forEach(([key, value]) => {
            const element = TraefikUtils.getElement(key, false);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                    // Trigger change event for checkbox toggles
                    element.dispatchEvent(new Event('change'));
                } else {
                    element.value = value;
                    // Trigger change event for select elements
                    if (element.tagName === 'SELECT') {
                        element.dispatchEvent(new Event('change'));
                    }
                }
            }
        });

        TraefikUtils.showNotification(`Label template "${templateName}" applied`, 'success');
    }

    /**
     * Initial Data Loading
     */
    async loadInitialData() {
        try {
            // Load core configuration
            await this.core.loadConfig();
            await this.core.loadMiddleware();
            await this.core.loadDNSProviders();
            
            TraefikUtils.showNotification('Application initialized successfully', 'success');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            TraefikUtils.showNotification('Failed to initialize application', 'error');
        }
    }

    /**
     * Tab Management
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName) {
                content.classList.add('active');
            }
        });

        // Load tab-specific data
        this.handleTabSwitch(tabName);
    }

    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'service-discovery':
                // Auto-load services if not already loaded
                if (!this.network.discoveredServices.length) {
                    this.network.scanDockerServices();
                }
                break;
            case 'network-management':
                // Auto-load networks if not already loaded
                if (!this.network.dockerNetworks.length) {
                    this.network.scanNetworks();
                }
                break;
            case 'domain-overview':
                // Auto-load domains if not already loaded
                if (!this.observability.domains.length) {
                    this.observability.scanDomains();
                }
                break;
            case 'observability':
                // Load observability config
                if (!Object.keys(this.observability.config).length) {
                    this.observability.loadObservabilityConfig();
                }
                break;
            case 'proxy-config':
                // Load proxy configuration and display presets
                if (!Object.keys(this.proxy.config).length) {
                    this.proxy.loadProxyConfig().catch(() => {
                        // Set default config if load fails
                        this.proxy.config = { enabled: false };
                    });
                }
                this.proxy.displayProxyPresets();
                break;
            case 'system-config':
                // Load system configuration status
                this.system.loadSystemStatus();
                this.system.refreshBackupList();
                break;
        }
    }

    /**
     * Core UI Helpers
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    async refreshAll() {
        try {
            await this.core.loadConfig();
            TraefikUtils.showNotification('Configuration refreshed', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to refresh configuration', 'error');
        }
    }

    /**
     * Form Toggle Helpers (delegated from modules)
     */
    toggleTLSOptions(enabled) {
        const tlsOptions = TraefikUtils.getElement('tls-options', false);
        if (tlsOptions) {
            tlsOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    handleTLSMethodChange(tlsMethod) {
        const dnsOptions = TraefikUtils.getElement('dns-options', false);
        const customCertOptions = TraefikUtils.getElement('custom-cert-options', false);
        
        if (dnsOptions) {
            dnsOptions.style.display = (tlsMethod === 'letsencrypt-dns') ? 'block' : 'none';
        }
        
        if (customCertOptions) {
            customCertOptions.style.display = (tlsMethod === 'custom') ? 'block' : 'none';
        }
    }

    toggleMiddlewareOptions(enabled) {
        const middlewareOptions = TraefikUtils.getElement('middleware-options', false);
        if (middlewareOptions) {
            middlewareOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    // Label generator toggles
    toggleLabelTLSOptions(enabled) {
        const tlsOptions = TraefikUtils.getElement('label-tls-options', false);
        if (tlsOptions) {
            tlsOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    handleLabelTLSMethodChange(tlsMethod) {
        const dnsOptions = TraefikUtils.getElement('label-dns-options', false);
        if (dnsOptions) {
            dnsOptions.style.display = (tlsMethod === 'letsencrypt-dns') ? 'block' : 'none';
        }
    }

    toggleLabelMiddlewareOptions(enabled) {
        const middlewareOptions = TraefikUtils.getElement('label-middleware-options', false);
        if (middlewareOptions) {
            middlewareOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    // Observability toggles
    toggleAccessLogsOptions(enabled) {
        const logOptions = TraefikUtils.getElement('access-logs-options', false);
        if (logOptions) {
            logOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    handleLogFormatChange(format) {
        // Handle log format specific options
        console.log('Log format changed to:', format);
    }

    toggleGraylogOptions(enabled) {
        const graylogOptions = TraefikUtils.getElement('graylog-options', false);
        if (graylogOptions) {
            graylogOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    toggleMetricsOptions(enabled) {
        const metricsOptions = TraefikUtils.getElement('metrics-options', false);
        if (metricsOptions) {
            metricsOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    toggleTracingOptions(enabled) {
        const tracingOptions = TraefikUtils.getElement('tracing-options', false);
        if (tracingOptions) {
            tracingOptions.style.display = enabled ? 'block' : 'none';
        }
    }

    handleTracingBackendChange(backend) {
        // Update endpoint placeholder based on backend
        const endpointField = TraefikUtils.getElement('tracing-endpoint', false);
        if (endpointField) {
            const placeholders = {
                jaeger: 'http://jaeger:14268/api/traces',
                zipkin: 'http://zipkin:9411/api/v2/spans',
                otlp: 'http://otel-collector:4317'
            };
            endpointField.placeholder = placeholders[backend] || '';
        }
    }

    updateSamplingRateDisplay(value) {
        const display = TraefikUtils.getElement('sampling-rate-value', false);
        if (display) {
            display.textContent = `${Math.round(value * 100)}%`;
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new TraefikUI();
});