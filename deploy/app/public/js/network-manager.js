/**
 * Traefik UI - Network Manager Module
 * Handles Docker service discovery, network management, and container operations
 * Version: 0.0.6
 */

class TraefikNetworkManager {
    
    constructor(mainUI) {
        this.ui = mainUI;
        this.discoveredServices = [];
        this.dockerNetworks = [];
        this.networkTopology = null;
    }

    /**
     * Service Discovery
     */
    async scanDockerServices() {
        const scanStatus = TraefikUtils.getElement('scan-status');
        const scanButton = TraefikUtils.getElement('scan-services');
        
        try {
            if (scanStatus) scanStatus.textContent = '🔍 Scanning Docker containers...';
            if (scanButton) scanButton.disabled = true;
            
            const services = await TraefikUtils.apiRequest('/api/docker/services');
            this.discoveredServices = services;
            this.displayDiscoveredServices(services);
            
            if (scanStatus) scanStatus.textContent = `✅ Found ${services.length} containers`;
            
            // Also load networks
            await this.loadDockerNetworks();
            
        } catch (error) {
            console.error('Failed to scan Docker services:', error);
            if (scanStatus) scanStatus.textContent = '❌ Failed to scan Docker services';
            TraefikUtils.showNotification(error.message, 'error');
        } finally {
            if (scanButton) scanButton.disabled = false;
        }
    }

    async refreshServices() {
        if (!this.discoveredServices || this.discoveredServices.length === 0) {
            TraefikUtils.showNotification('Click "Scan for Services" first to discover containers', 'info');
            return;
        }
        await this.scanDockerServices();
    }

    displayDiscoveredServices(services) {
        const container = TraefikUtils.getElement('discovered-services');
        if (!container) return;
        
        if (services.length === 0) {
            container.innerHTML = '<p>No Docker containers found.</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Container Name' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'traefik', label: 'Traefik', type: 'status' },
            { key: 'project', label: 'Project' },
            { key: 'networks', label: 'Networks' },
            { key: 'ports', label: 'Ports' },
            { 
                key: 'actions', 
                label: 'Actions', 
                type: 'actions',
                actions: [
                    {
                        label: 'Details',
                        type: 'secondary',
                        handler: (item) => this.viewServiceDetails(item.id)
                    },
                    {
                        label: 'Edit Labels',
                        type: 'primary',
                        condition: (item) => item.traefikEnabled,
                        handler: (item) => this.editServiceLabels(item.id)
                    },
                    {
                        label: 'Enable Traefik',
                        type: 'accent',
                        condition: (item) => !item.traefikEnabled,
                        handler: (item) => this.enableTraefik(item.id)
                    }
                ]
            }
        ];

        const data = services.map(service => ({
            id: service.id,
            name: service.name,
            status: service.status,
            traefik: service.traefikConfig.enabled ? 'enabled' : 'disabled',
            traefikEnabled: service.traefikConfig.enabled,
            project: `${service.compose.project}/${service.compose.service}`,
            networks: service.networks.join(', ') || 'None',
            ports: service.ports.map(p => 
                p.PublicPort ? `${p.PrivatePort}:${p.PublicPort}` : p.PrivatePort
            ).join(', ') || 'None'
        }));

        const table = TraefikUIComponents.createTable(headers, data, {
            className: 'services-table'
        });
        
        container.innerHTML = '';
        container.appendChild(table);
    }

    filterServices(filter) {
        const table = TraefikUtils.getElement('discovered-services')?.querySelector('table');
        if (!table) return;

        TraefikUIComponents.filterTableRows(table, (index, row) => {
            const service = this.discoveredServices[index];
            if (!service) return false;

            switch (filter) {
                case 'running':
                    return service.status === 'running';
                case 'stopped':
                    return service.status === 'stopped';
                case 'traefik-enabled':
                    return service.traefikConfig.enabled;
                case 'traefik-disabled':
                    return !service.traefikConfig.enabled;
                case 'all':
                default:
                    return true;
            }
        });
    }

    async viewServiceDetails(serviceId) {
        const service = this.discoveredServices.find(s => s.id === serviceId);
        if (!service) {
            TraefikUtils.showNotification('Service not found', 'error');
            return;
        }

        const modalContent = this.buildServiceDetailsModal(service);
        const modal = document.createElement('div');
        modal.className = 'modal service-details-modal';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Close handlers
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    buildServiceDetailsModal(service) {
        const traefikLabels = Object.entries(service.labels.traefik)
            .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
            .join('');

        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Service Details: ${service.name}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="service-detail-grid">
                        <div class="detail-section">
                            <h4>Basic Information</h4>
                            <table class="detail-table">
                                <tr><td>Container ID</td><td>${service.id.substring(0, 12)}</td></tr>
                                <tr><td>Name</td><td>${service.name}</td></tr>
                                <tr><td>Status</td><td>${TraefikUtils.createStatusBadge(service.status).outerHTML}</td></tr>
                                <tr><td>Image</td><td>${service.image}</td></tr>
                                <tr><td>Project</td><td>${service.compose.project}</td></tr>
                                <tr><td>Service</td><td>${service.compose.service}</td></tr>
                            </table>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Network Information</h4>
                            <table class="detail-table">
                                <tr><td>Networks</td><td>${service.networks.join(', ') || 'None'}</td></tr>
                                <tr><td>Ports</td><td>${service.ports.map(p => 
                                    p.PublicPort ? `${p.PrivatePort}:${p.PublicPort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`
                                ).join('<br>') || 'None'}</td></tr>
                            </table>
                        </div>
                        
                        ${traefikLabels ? `
                        <div class="detail-section full-width">
                            <h4>Traefik Labels (${Object.keys(service.labels.traefik).length})</h4>
                            <table class="detail-table labels-table">
                                <thead>
                                    <tr><th>Label</th><th>Value</th></tr>
                                </thead>
                                <tbody>
                                    ${traefikLabels}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async editServiceLabels(serviceId) {
        // Implementation for editing service labels
        TraefikUIComponents.showModal('service-edit-modal');
        
        const service = this.discoveredServices.find(s => s.id === serviceId);
        if (!service) return;

        // Populate modal with current service data
        const form = TraefikUtils.getElement('service-edit-form');
        if (form) {
            form.dataset.serviceId = serviceId;
            // Populate form fields based on current Traefik labels
            this.populateServiceEditForm(service);
        }
    }

    populateServiceEditForm(service) {
        // Extract common values from Traefik labels
        const labels = service.labels.traefik;
        
        // Find router configuration
        const routerKeys = Object.keys(labels).filter(key => key.includes('.routers.'));
        const routerName = routerKeys[0]?.split('.routers.')[1]?.split('.')[0];
        
        if (routerName) {
            const ruleKey = `traefik.http.routers.${routerName}.rule`;
            const rule = labels[ruleKey];
            
            if (rule) {
                const hostname = rule.match(/Host\(\`([^`]+)\`\)/)?.[1];
                if (hostname) {
                    const hostnameField = TraefikUtils.getElement('edit-hostname');
                    if (hostnameField) hostnameField.value = hostname;
                }
            }
        }
        
        // Populate other fields...
    }

    async enableTraefik(serviceId) {
        // Switch to Add Route tab and pre-populate with service info
        this.ui.switchTab('add-route');
        
        const service = this.discoveredServices.find(s => s.id === serviceId);
        if (!service) return;

        // Pre-populate form with service information
        const routeNameField = TraefikUtils.getElement('route-name');
        const hostnameField = TraefikUtils.getElement('hostname');
        const backendUrlField = TraefikUtils.getElement('backend-url');
        
        if (routeNameField) routeNameField.value = service.compose.service;
        if (hostnameField) hostnameField.value = `${service.compose.service}.example.com`;
        
        // Try to detect internal port
        const internalPort = service.ports.find(p => !p.PublicPort)?.PrivatePort || 
                            service.ports[0]?.PrivatePort || 
                            '80';
        
        if (backendUrlField) {
            backendUrlField.value = `http://${service.name}:${internalPort}`;
        }
        
        TraefikUtils.showNotification(`Pre-populated form with ${service.name} details`, 'info');
    }

    /**
     * Network Management
     */
    async loadDockerNetworks() {
        try {
            const data = await TraefikUtils.apiRequest('/api/docker/networks');
            this.dockerNetworks = data;
            this.displayDockerNetworks(data);
            return data;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load Docker networks', 'error');
            throw error;
        }
    }

    displayDockerNetworks(networks) {
        const container = TraefikUtils.getElement('docker-networks');
        if (!container) return;
        
        if (networks.length === 0) {
            container.innerHTML = '<p>No Docker networks found.</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Network Name' },
            { key: 'driver', label: 'Driver' },
            { key: 'scope', label: 'Scope' },
            { key: 'attachable', label: 'Attachable', type: 'status' },
            { key: 'containers', label: 'Containers' },
            { key: 'subnet', label: 'Subnet' }
        ];

        const data = networks.map(network => ({
            name: network.Name,
            driver: network.Driver,
            scope: network.Scope,
            attachable: network.Attachable ? 'yes' : 'no',
            containers: Object.keys(network.Containers || {}).length,
            subnet: network.IPAM?.Config?.[0]?.Subnet || 'N/A'
        }));

        const table = TraefikUIComponents.createTable(headers, data);
        container.innerHTML = '';
        container.appendChild(table);
    }

    /**
     * Network Management Operations
     */
    async scanNetworks() {
        const scanStatus = TraefikUtils.getElement('network-scan-status');
        const scanButton = TraefikUtils.getElement('scan-networks');
        
        try {
            if (scanStatus) scanStatus.textContent = '🔍 Scanning Docker networks...';
            if (scanButton) scanButton.disabled = true;
            
            const networks = await TraefikUtils.apiRequest('/api/networks/management');
            this.displayNetworkManagement(networks);
            
            if (scanStatus) scanStatus.textContent = `✅ Found ${networks.length} networks`;
            
        } catch (error) {
            console.error('Failed to scan networks:', error);
            if (scanStatus) scanStatus.textContent = '❌ Failed to scan networks';
            TraefikUtils.showNotification(error.message, 'error');
        } finally {
            if (scanButton) scanButton.disabled = false;
        }
    }

    async refreshNetworks() {
        await this.scanNetworks();
    }

    displayNetworkManagement(networks) {
        const container = TraefikUtils.getElement('available-networks');
        if (!container) return;
        
        if (networks.length === 0) {
            container.innerHTML = '<p>No external networks found.</p>';
            return;
        }

        const headers = [
            { key: 'name', label: 'Network Name' },
            { key: 'driver', label: 'Driver' },
            { key: 'attachable', label: 'Attachable', type: 'status' },
            { key: 'traefikConnected', label: 'Traefik Status', type: 'status' },
            { key: 'containers', label: 'Containers' },
            { 
                key: 'actions', 
                label: 'Actions', 
                type: 'actions',
                actions: [
                    {
                        label: 'Connect',
                        type: 'primary',
                        condition: (item) => item.attachable && !item.traefikConnected,
                        handler: (item) => this.connectToNetwork(item.id)
                    },
                    {
                        label: 'Disconnect',
                        type: 'danger',
                        condition: (item) => item.traefikConnected && item.canDisconnect,
                        handler: (item) => this.disconnectFromNetwork(item.id)
                    }
                ]
            }
        ];

        const data = networks.map(network => ({
            id: network.Id,
            name: network.Name,
            driver: network.Driver,
            attachable: network.Attachable ? 'yes' : 'no',
            traefikConnected: network.traefikConnected ? 'connected' : 'disconnected',
            canDisconnect: network.canDisconnect,
            containers: Object.keys(network.Containers || {}).length
        }));

        const table = TraefikUIComponents.createTable(headers, data);
        container.innerHTML = '';
        container.appendChild(table);
    }

    async connectToNetwork(networkId) {
        const network = this.dockerNetworks.find(n => n.Id === networkId);
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Connect Traefik to network "${network?.Name || networkId}"?`,
            'Connect to Network'
        );
        
        if (!confirmed) return;

        try {
            await TraefikUtils.apiRequest(`/api/networks/${networkId}/connect`, {
                method: 'POST'
            });
            
            TraefikUtils.showNotification('Traefik connected to network successfully!', 'success');
            this.scanNetworks(); // Refresh the list
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to connect to network', 'error');
        }
    }

    async disconnectFromNetwork(networkId) {
        const network = this.dockerNetworks.find(n => n.Id === networkId);
        const confirmed = await TraefikUIComponents.showConfirmDialog(
            `Disconnect Traefik from network "${network?.Name || networkId}"?`,
            'Disconnect from Network'
        );
        
        if (!confirmed) return;

        try {
            await TraefikUtils.apiRequest(`/api/networks/${networkId}/disconnect`, {
                method: 'POST'
            });
            
            TraefikUtils.showNotification('Traefik disconnected from network successfully!', 'success');
            this.scanNetworks(); // Refresh the list
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to disconnect from network', 'error');
        }
    }

    filterNetworks(filter) {
        const table = TraefikUtils.getElement('available-networks')?.querySelector('table');
        if (!table) return;

        TraefikUIComponents.filterTableRows(table, (index, row) => {
            const network = this.dockerNetworks[index];
            if (!network) return false;

            switch (filter) {
                case 'connected':
                    return network.traefikConnected;
                case 'disconnected':
                    return !network.traefikConnected;
                case 'attachable':
                    return network.Attachable;
                case 'all':
                default:
                    return true;
            }
        });
    }

    /**
     * Network Topology
     */
    async loadNetworkTopology() {
        try {
            const topology = await TraefikUtils.apiRequest('/api/networks/topology');
            this.networkTopology = topology;
            this.displayNetworkTopology(topology);
            return topology;
        } catch (error) {
            TraefikUtils.showNotification('Failed to load network topology', 'error');
            throw error;
        }
    }

    displayNetworkTopology(topology) {
        const container = TraefikUtils.getElement('network-topology');
        if (!container) return;

        // Create visual network map
        const networkMap = this.createNetworkVisualization(topology);
        container.innerHTML = '';
        container.appendChild(networkMap);
    }

    createNetworkVisualization(topology) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '400');
        svg.className = 'network-topology-svg';

        // Create network nodes and connections
        const networks = topology.networks || [];
        const containers = topology.containers || [];
        
        // Position networks in a grid
        networks.forEach((network, index) => {
            const x = 100 + (index % 3) * 200;
            const y = 100 + Math.floor(index / 3) * 150;
            
            const networkNode = this.createNetworkNode(network, x, y);
            svg.appendChild(networkNode);
            
            // Add containers connected to this network
            const connectedContainers = containers.filter(c => 
                c.networks.includes(network.Name)
            );
            
            connectedContainers.forEach((container, cIndex) => {
                const cx = x + 150 + (cIndex * 30);
                const cy = y;
                
                const containerNode = this.createContainerNode(container, cx, cy);
                svg.appendChild(containerNode);
                
                // Draw connection line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x + 50);
                line.setAttribute('y1', y + 25);
                line.setAttribute('x2', cx);
                line.setAttribute('y2', cy);
                line.setAttribute('stroke', '#666');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            });
        });

        return svg;
    }

    createNetworkNode(network, x, y) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${x}, ${y})`);
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '50');
        rect.setAttribute('fill', network.traefikConnected ? '#4CAF50' : '#FF9800');
        rect.setAttribute('stroke', '#333');
        rect.setAttribute('rx', '5');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '30');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.textContent = network.Name.substring(0, 12);
        
        g.appendChild(rect);
        g.appendChild(text);
        
        return g;
    }

    createContainerNode(container, x, y) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', container.status === 'running' ? '#4CAF50' : '#F44336');
        circle.setAttribute('stroke', '#333');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = container.name;
        circle.appendChild(title);
        
        return circle;
    }

    /**
     * Event Handlers for Service Edit Modal
     */
    closeServiceModal() {
        TraefikUIComponents.hideModal('service-edit-modal');
    }

    async handleServiceEdit(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            const serviceId = e.target.dataset.serviceId;
            
            await TraefikUtils.apiRequest(`/api/docker/labels/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            TraefikUtils.showNotification('Service labels updated successfully!', 'success');
            this.closeServiceModal();
            this.scanDockerServices(); // Refresh the list
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to update service labels', 'error');
        }
    }

    /**
     * Network Connection Modal
     */
    closeNetworkModal() {
        TraefikUIComponents.hideModal('network-connect-modal');
    }

    async handleNetworkConnect(e) {
        e.preventDefault();
        
        try {
            const formData = TraefikUtils.getFormData(e.target);
            const networkId = formData.networkId;
            
            await this.connectToNetwork(networkId);
            this.closeNetworkModal();
            
        } catch (error) {
            TraefikUtils.showNotification('Failed to connect to network', 'error');
        }
    }
}

// Make available globally
window.TraefikNetworkManager = TraefikNetworkManager;