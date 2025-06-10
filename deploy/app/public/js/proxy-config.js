/**
 * Traefik UI - Proxy Configuration Module
 * Handles remote proxy scenarios, IP forwarding, and security settings
 * Version: 0.0.7
 */

class TraefikProxyConfig {
    
    constructor(mainUI) {
        this.ui = mainUI;
        this.config = {};
        this.presets = this.initializeProxyPresets();
        this.trustedProxyRanges = this.initializeTrustedRanges();
    }

    /**
     * Proxy Scenario Presets
     */
    initializeProxyPresets() {
        return {
            cloudflare: {
                name: 'CloudFlare',
                description: 'Behind CloudFlare CDN with real IP forwarding',
                explanation: 'CloudFlare acts as a reverse proxy, forwarding requests with X-Forwarded-For and CF-Connecting-IP headers. This preset configures Traefik to trust CloudFlare IPs and extract real client IPs.',
                forwardedHeaders: {
                    trustedIPs: [
                        "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
                        "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
                        "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
                        "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
                        "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
                        "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32",
                        "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"
                    ],
                    insecure: false
                },
                entryPoints: {
                    web: {
                        address: ":80",
                        forwardedHeaders: {
                            trustedIPs: "cloudflare"
                        }
                    },
                    websecure: {
                        address: ":443", 
                        forwardedHeaders: {
                            trustedIPs: "cloudflare"
                        }
                    }
                },
                middleware: {
                    realip: {
                        realIPHeader: "CF-Connecting-IP",
                        depth: 1
                    }
                },
                rateLimit: {
                    average: 100,
                    burst: 200,
                    sourceCriterion: {
                        requestHeaderName: "CF-Connecting-IP"
                    }
                }
            },
            aws_alb: {
                name: 'AWS Application Load Balancer',
                description: 'Behind AWS ALB with VPC IP forwarding',
                explanation: 'AWS ALB forwards requests from within VPC subnets. This preset trusts private IP ranges and uses X-Forwarded-For headers to identify real client IPs.',
                forwardedHeaders: {
                    trustedIPs: [
                        "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"
                    ],
                    insecure: false
                },
                entryPoints: {
                    web: {
                        address: ":80",
                        forwardedHeaders: {
                            trustedIPs: ["10.0.0.0/8", "172.16.0.0/12"]
                        }
                    },
                    websecure: {
                        address: ":443",
                        forwardedHeaders: {
                            trustedIPs: ["10.0.0.0/8", "172.16.0.0/12"]
                        }
                    }
                },
                middleware: {
                    realip: {
                        realIPHeader: "X-Forwarded-For",
                        depth: 1
                    }
                },
                rateLimit: {
                    average: 50,
                    burst: 100,
                    sourceCriterion: {
                        requestHeaderName: "X-Forwarded-For"
                    }
                }
            },
            nginx: {
                name: 'nginx Reverse Proxy',
                description: 'Behind nginx with custom header forwarding',
                explanation: 'nginx reverse proxy typically forwards X-Real-IP and X-Forwarded-For headers. This preset configures Traefik to trust your nginx server IPs and process forwarded headers correctly.',
                forwardedHeaders: {
                    trustedIPs: ["192.168.1.0/24", "10.0.0.0/24"],
                    insecure: false
                },
                entryPoints: {
                    web: {
                        address: ":80",
                        forwardedHeaders: {
                            trustedIPs: ["192.168.1.0/24"]
                        }
                    },
                    websecure: {
                        address: ":443",
                        forwardedHeaders: {
                            trustedIPs: ["192.168.1.0/24"]
                        }
                    }
                },
                middleware: {
                    realip: {
                        realIPHeader: "X-Real-IP",
                        depth: 1
                    }
                },
                rateLimit: {
                    average: 30,
                    burst: 60,
                    sourceCriterion: {
                        requestHeaderName: "X-Real-IP"
                    }
                }
            },
            haproxy: {
                name: 'HAProxy Load Balancer',
                description: 'Behind HAProxy with PROXY protocol support',
                explanation: 'HAProxy can use PROXY protocol to preserve original client information. This preset enables PROXY protocol support and configures proper IP forwarding.',
                proxyProtocol: {
                    trustedIPs: ["192.168.1.0/24", "10.0.0.0/24"]
                },
                entryPoints: {
                    web: {
                        address: ":80",
                        proxyProtocol: {
                            trustedIPs: ["192.168.1.0/24"]
                        }
                    },
                    websecure: {
                        address: ":443",
                        proxyProtocol: {
                            trustedIPs: ["192.168.1.0/24"]
                        }
                    }
                },
                forwardedHeaders: {
                    trustedIPs: ["192.168.1.0/24"],
                    insecure: false
                },
                rateLimit: {
                    average: 40,
                    burst: 80,
                    sourceCriterion: {
                        requestHeader: "X-Forwarded-For"
                    }
                }
            },
            custom: {
                name: 'Custom Configuration',
                description: 'Manual configuration for specific proxy scenarios',
                explanation: 'Configure custom trusted IPs, headers, and forwarding behavior for your specific proxy setup.',
                forwardedHeaders: {
                    trustedIPs: [],
                    insecure: false
                },
                entryPoints: {
                    web: { address: ":80" },
                    websecure: { address: ":443" }
                },
                middleware: {},
                rateLimit: {
                    average: 100,
                    burst: 200
                }
            }
        };
    }

    /**
     * Known Proxy IP Ranges
     */
    initializeTrustedRanges() {
        return {
            cloudflare: {
                ipv4: [
                    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
                    "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
                    "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
                    "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
                    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"
                ],
                ipv6: [
                    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32",
                    "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"
                ]
            },
            aws: {
                ipv4: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
                description: "Private VPC ranges"
            },
            private: {
                ipv4: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8"],
                description: "RFC 1918 private ranges"
            }
        };
    }

    /**
     * Configuration Loading and Management
     */
    async loadProxyConfig() {
        try {
            const config = await TraefikUtils.apiRequest('/api/proxy/config');
            this.config = config;
            this.populateProxyForm(config);
            this.updateProxyStatus(config);
            return config;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load proxy configuration', 'error');
            throw error;
        }
    }

    populateProxyForm(config) {
        // Populate current proxy preset
        const presetSelect = TraefikUtils.getElement('proxy-preset', false);
        if (presetSelect && config.currentPreset) {
            presetSelect.value = config.currentPreset;
        }

        // Populate trusted IPs
        const trustedIPs = TraefikUtils.getElement('trusted-ips', false);
        if (trustedIPs && config.forwardedHeaders?.trustedIPs) {
            trustedIPs.value = config.forwardedHeaders.trustedIPs.join('\n');
        }

        // Populate forwarding options
        const enableForwarding = TraefikUtils.getElement('enable-ip-forwarding', false);
        if (enableForwarding) {
            enableForwarding.checked = config.forwardedHeaders?.enabled || false;
            this.toggleForwardingOptions(config.forwardedHeaders?.enabled || false);
        }

        // Populate rate limiting
        const enableRateLimit = TraefikUtils.getElement('enable-rate-limiting', false);
        if (enableRateLimit) {
            enableRateLimit.checked = config.rateLimit?.enabled || false;
            this.toggleRateLimitOptions(config.rateLimit?.enabled || false);
        }

        // Populate specific configuration fields
        this.populateConfigFields(config);
    }

    populateConfigFields(config) {
        const fields = [
            'real-ip-header', 'forwarded-depth', 'rate-limit-average', 
            'rate-limit-burst', 'rate-source-header'
        ];
        
        fields.forEach(fieldId => {
            const element = TraefikUtils.getElement(fieldId, false);
            if (element) {
                const configPath = this.getConfigPath(fieldId);
                const value = this.getNestedValue(config, configPath);
                if (value !== undefined) {
                    element.value = value;
                }
            }
        });
    }

    getConfigPath(fieldId) {
        const mapping = {
            'real-ip-header': 'middleware.realip.realIPHeader',
            'forwarded-depth': 'middleware.realip.depth',
            'rate-limit-average': 'rateLimit.average',
            'rate-limit-burst': 'rateLimit.burst',
            'rate-source-header': 'rateLimit.sourceCriterion.requestHeaderName'
        };
        return mapping[fieldId] || fieldId;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Preset Management
     */
    async applyProxyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            TraefikUtils.showNotification('Proxy preset not found', 'error');
            return;
        }

        try {
            TraefikUtils.showNotification(`Applying ${preset.name} preset...`, 'info');
            
            await TraefikUtils.apiRequest('/api/proxy/preset', {
                method: 'POST',
                body: JSON.stringify({ preset: presetName, config: preset })
            });
            
            // Update UI with preset configuration
            this.populateProxyForm(preset);
            this.updateProxyStatus(preset);
            
            TraefikUtils.showNotification(`${preset.name} preset applied successfully!`, 'success');
            
        } catch (error) {
            TraefikUtils.showNotification(`Failed to apply ${preset.name} preset`, 'error');
        }
    }

    displayProxyPresets() {
        const container = TraefikUtils.getElement('proxy-presets-list');
        if (!container) return;

        container.innerHTML = Object.entries(this.presets).map(([key, preset]) => 
            this.createPresetCard(key, preset)
        ).join('');
    }

    createPresetCard(key, preset) {
        return `
            <div class="preset-card" data-preset="${key}">
                <div class="preset-header">
                    <h4 class="preset-name">${preset.name}</h4>
                    <button class="btn btn-primary btn-sm" onclick="window.traefikUI.proxy.applyProxyPreset('${key}')">
                        Apply
                    </button>
                </div>
                <div class="preset-description">
                    ${preset.description}
                </div>
                <div class="preset-explanation">
                    <small>${preset.explanation}</small>
                </div>
                <div class="preset-features">
                    ${this.buildPresetFeatures(preset)}
                </div>
            </div>
        `;
    }

    buildPresetFeatures(preset) {
        const features = [];
        
        if (preset.forwardedHeaders?.trustedIPs?.length) {
            features.push(`📍 ${preset.forwardedHeaders.trustedIPs.length} trusted IP ranges`);
        }
        
        if (preset.middleware?.realip) {
            features.push(`🔍 Real IP from ${preset.middleware.realip.realIPHeader}`);
        }
        
        if (preset.rateLimit) {
            features.push(`⚡ Rate limit: ${preset.rateLimit.average}/avg ${preset.rateLimit.burst}/burst`);
        }
        
        if (preset.proxyProtocol) {
            features.push(`🔗 PROXY protocol support`);
        }
        
        return features.map(feature => `<span class="preset-feature">${feature}</span>`).join('');
    }

    /**
     * Form Handlers
     */
    async handleProxyConfigSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            const config = this.buildProxyConfig(formData);
            
            await TraefikUtils.apiRequest('/api/proxy/config', {
                method: 'PUT',
                body: JSON.stringify(config)
            });
            
            TraefikUtils.showNotification('Proxy configuration updated successfully!', 'success');
            this.updateProxyStatus(config);
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to update proxy configuration', 'error');
        }
    }

    buildProxyConfig(formData) {
        const config = {
            enabled: formData.enableIpForwarding || false,
            currentPreset: formData.proxyPreset || 'custom',
            forwardedHeaders: {
                enabled: formData.enableIpForwarding || false,
                trustedIPs: formData.trustedIps ? 
                    formData.trustedIps.split('\n').map(ip => ip.trim()).filter(ip => ip) : [],
                insecure: formData.allowInsecureForwarding || false
            },
            middleware: {
                realip: {
                    realIPHeader: formData.realIpHeader || 'X-Forwarded-For',
                    depth: parseInt(formData.forwardedDepth) || 1
                }
            },
            rateLimit: {
                enabled: formData.enableRateLimiting || false,
                average: parseInt(formData.rateLimitAverage) || 100,
                burst: parseInt(formData.rateLimitBurst) || 200,
                sourceCriterion: {
                    requestHeaderName: formData.rateSourceHeader || 'X-Forwarded-For'
                }
            }
        };

        return config;
    }

    /**
     * IP Testing and Validation
     */
    async testIPForwarding() {
        try {
            TraefikUtils.showNotification('Testing IP forwarding configuration...', 'info');
            
            const result = await TraefikUtils.apiRequest('/api/proxy/test-ip', {
                method: 'POST'
            });
            
            if (result.success) {
                this.displayIPTestResults(result);
                TraefikUtils.showNotification('IP forwarding test completed!', 'success');
            } else {
                TraefikUtils.showNotification(`IP test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            TraefikUtils.showNotification('Failed to test IP forwarding', 'error');
        }
    }

    displayIPTestResults(result) {
        const container = TraefikUtils.getElement('ip-test-results');
        if (!container) return;

        container.innerHTML = `
            <div class="test-results">
                <h4>IP Forwarding Test Results</h4>
                <div class="test-result-grid">
                    <div class="test-item">
                        <span class="test-label">Detected Client IP:</span>
                        <span class="test-value">${result.clientIP || 'Unknown'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-label">Original Remote Addr:</span>
                        <span class="test-value">${result.remoteAddr || 'Unknown'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-label">X-Forwarded-For:</span>
                        <span class="test-value">${result.xForwardedFor || 'Not present'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-label">X-Real-IP:</span>
                        <span class="test-value">${result.xRealIP || 'Not present'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-label">Forwarding Status:</span>
                        <span class="test-value ${result.forwardingWorking ? 'success' : 'error'}">
                            ${result.forwardingWorking ? 'Working' : 'Not Working'}
                        </span>
                    </div>
                </div>
                ${result.recommendations ? `
                <div class="test-recommendations">
                    <h5>Recommendations:</h5>
                    <ul>
                        ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        `;
        
        container.style.display = 'block';
    }

    async validateProxyConfiguration() {
        try {
            const config = this.buildProxyConfig(TraefikUtils.getFormData(
                TraefikUtils.getElement('proxy-config-form')
            ));
            
            const result = await TraefikUtils.apiRequest('/api/proxy/validate', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            if (result.valid) {
                TraefikUtils.showNotification('Proxy configuration is valid!', 'success');
            } else {
                TraefikUtils.showNotification(`Configuration issues: ${result.errors.join(', ')}`, 'warning');
            }
            
            return result;
        } catch (error) {
            TraefikUtils.showNotification('Failed to validate proxy configuration', 'error');
        }
    }

    /**
     * UI Toggle Helpers
     */
    toggleForwardingOptions(enabled) {
        const options = TraefikUtils.getElement('forwarding-options', false);
        if (options) {
            options.style.display = enabled ? 'block' : 'none';
        }
    }

    toggleRateLimitOptions(enabled) {
        const options = TraefikUtils.getElement('rate-limit-options', false);
        if (options) {
            options.style.display = enabled ? 'block' : 'none';
        }
    }

    toggleProxyProtocolOptions(enabled) {
        const options = TraefikUtils.getElement('proxy-protocol-options', false);
        if (options) {
            options.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Status Updates
     */
    updateProxyStatus(config) {
        this.updateStatusIndicator('forwarding', 
            config.forwardedHeaders?.enabled ? 'Enabled' : 'Disabled');
        this.updateStatusIndicator('rate-limiting', 
            config.rateLimit?.enabled ? `${config.rateLimit.average}/avg` : 'Disabled');
        this.updateStatusIndicator('trusted-ips', 
            config.forwardedHeaders?.trustedIPs?.length ? 
            `${config.forwardedHeaders.trustedIPs.length} ranges` : 'None');
    }

    updateStatusIndicator(type, status) {
        const statusElement = TraefikUtils.getElement(`${type}-status`, false);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-indicator ${
                status.toLowerCase().includes('disabled') || status === 'None' ? 'disabled' : 'enabled'
            }`;
        }
    }

    /**
     * Helper Functions
     */
    populateTrustedIPField(ranges) {
        const field = TraefikUtils.getElement('trusted-ips', false);
        if (field) {
            if (Array.isArray(ranges)) {
                field.value = ranges.join('\n');
            } else if (typeof ranges === 'string' && this.trustedProxyRanges[ranges]) {
                const rangeData = this.trustedProxyRanges[ranges];
                field.value = [...(rangeData.ipv4 || []), ...(rangeData.ipv6 || [])].join('\n');
            }
        }
    }

    async exportProxyConfig() {
        try {
            const config = await TraefikUtils.apiRequest('/api/proxy/config');
            
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'traefik-proxy-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            TraefikUtils.showNotification('Proxy configuration exported successfully!', 'success');
        } catch (error) {
            TraefikUtils.showNotification('Failed to export proxy configuration', 'error');
        }
    }
}

// Make available globally
window.TraefikProxyConfig = TraefikProxyConfig;