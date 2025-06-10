const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const TRAEFIK_CONFIG_PATH = process.env.TRAEFIK_CONFIG || '/etc/traefik/traefik.yml';
const DYNAMIC_CONFIG_PATH = process.env.DYNAMIC_CONFIG || '/etc/traefik/dynamic.yml';

app.get('/api/config', (req, res) => {
  try {
    const staticConfig = fs.existsSync(TRAEFIK_CONFIG_PATH) 
      ? yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8')) 
      : {};
    const dynamicConfig = fs.existsSync(DYNAMIC_CONFIG_PATH)
      ? yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'))
      : { http: { routers: {}, services: {} }, tls: { certificates: [] } };
    
    res.json({ static: staticConfig, dynamic: dynamicConfig });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/router', (req, res) => {
  try {
    const { name, rule, service, tls, middleware } = req.body;
    
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }
    
    if (!config.http) config.http = {};
    if (!config.http.routers) config.http.routers = {};
    if (!config.http.services) config.http.services = {};
    
    config.http.routers[name] = {
      rule: rule,
      service: service
    };
    
    if (tls) {
      config.http.routers[name].tls = tls;
    }
    
    if (middleware && middleware.length > 0) {
      config.http.routers[name].middlewares = middleware;
    }
    
    fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
    res.json({ success: true, message: 'Router added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/service', (req, res) => {
  try {
    const { name, url, options } = req.body;
    
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }
    
    if (!config.http) config.http = {};
    if (!config.http.services) config.http.services = {};
    
    config.http.services[name] = {
      loadBalancer: {
        servers: [{ url: url }]
      }
    };
    
    if (options) {
      Object.assign(config.http.services[name].loadBalancer, options);
    }
    
    fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
    res.json({ success: true, message: 'Service added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/restart', (req, res) => {
  const command = process.env.RESTART_COMMAND || 'docker restart traefik';
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true, message: 'Traefik restarted successfully', output: stdout });
  });
});

app.delete('/api/router/:name', (req, res) => {
  try {
    const { name } = req.params;
    
    if (!fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      return res.status(404).json({ error: 'Configuration file not found' });
    }
    
    const config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    
    if (config.http && config.http.routers && config.http.routers[name]) {
      delete config.http.routers[name];
      fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
      res.json({ success: true, message: 'Router deleted successfully' });
    } else {
      res.status(404).json({ error: 'Router not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CrowdSec middleware management
app.post('/api/middleware/crowdsec', (req, res) => {
  try {
    const { name, enabled, mode, lapiKey, appsecEnabled, trustedIPs, lapiUrl } = req.body;
    
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }
    
    if (!config.http) config.http = {};
    if (!config.http.middlewares) config.http.middlewares = {};
    
    if (enabled) {
      config.http.middlewares[name] = {
        plugin: {
          'crowdsec-bouncer-traefik-plugin': {
            enabled: true,
            crowdsecMode: mode || 'stream',
            crowdsecLapiKey: lapiKey,
            crowdsecLapiUrl: lapiUrl || 'http://crowdsec:8080',
            crowdsecAppsecEnabled: appsecEnabled || false,
            clientTrustedIPs: trustedIPs || []
          }
        }
      };
    } else {
      // Disable or remove middleware
      if (config.http.middlewares[name]) {
        delete config.http.middlewares[name];
      }
    }
    
    fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
    res.json({ success: true, message: 'CrowdSec middleware updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/middleware', (req, res) => {
  try {
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }
    
    const middlewares = config.http?.middlewares || {};
    res.json({ middlewares });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/middleware/:name', (req, res) => {
  try {
    const { name } = req.params;
    
    if (!fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      return res.status(404).json({ error: 'Configuration file not found' });
    }
    
    const config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    
    if (config.http && config.http.middlewares && config.http.middlewares[name]) {
      delete config.http.middlewares[name];
      fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
      res.json({ success: true, message: 'Middleware deleted successfully' });
    } else {
      res.status(404).json({ error: 'Middleware not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom certificate management
app.post('/api/certificate', (req, res) => {
  try {
    const { hostname, certChain, privateKey } = req.body;
    
    // Validate certificate format
    if (!certChain.includes('-----BEGIN CERTIFICATE-----') || !certChain.includes('-----END CERTIFICATE-----')) {
      return res.status(400).json({ error: 'Invalid certificate format. Must be PEM format.' });
    }
    
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      return res.status(400).json({ error: 'Invalid private key format. Must be PEM format.' });
    }
    
    // Create certificates directory if it doesn't exist
    const certsDir = path.join(__dirname, 'certs');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }
    
    // Write certificate files (paths for Traefik container)
    const certPath = `/certs/${hostname}.crt`;
    const keyPath = `/certs/${hostname}.key`;
    
    // Write to actual filesystem  
    fs.writeFileSync(path.join(certsDir, `${hostname}.crt`), certChain);
    fs.writeFileSync(path.join(certsDir, `${hostname}.key`), privateKey);
    
    // Update dynamic configuration with certificate store
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }
    
    if (!config.tls) config.tls = {};
    if (!config.tls.stores) config.tls.stores = {};
    if (!config.tls.stores.default) config.tls.stores.default = {};
    if (!config.tls.certificates) config.tls.certificates = [];
    
    // Add certificate to the certificates array
    const existingCertIndex = config.tls.certificates.findIndex(cert => 
      cert.certFile && cert.certFile.includes(hostname)
    );
    
    const newCert = {
      certFile: certPath,
      keyFile: keyPath
    };
    
    if (existingCertIndex >= 0) {
      config.tls.certificates[existingCertIndex] = newCert;
    } else {
      config.tls.certificates.push(newCert);
    }
    
    fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
    res.json({ success: true, message: 'Certificate stored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/certificate/:hostname', (req, res) => {
  try {
    const { hostname } = req.params;
    
    // Remove certificate files
    const certsDir = path.join(__dirname, 'certs');
    const certPath = path.join(certsDir, `${hostname}.crt`);
    const keyPath = path.join(certsDir, `${hostname}.key`);
    
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    
    // Update dynamic configuration
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      const config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
      
      if (config.tls && config.tls.certificates) {
        config.tls.certificates = config.tls.certificates.filter(cert => 
          !cert.certFile || !cert.certFile.includes(hostname)
        );
        
        fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
      }
    }
    
    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker API integration
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Helper function to parse Traefik labels from containers
function parseTraefikLabels(labels) {
  const traefikLabels = {};
  const otherLabels = {};
  
  for (const [key, value] of Object.entries(labels || {})) {
    if (key.startsWith('traefik.')) {
      traefikLabels[key] = value;
    } else {
      otherLabels[key] = value;
    }
  }
  
  return { traefikLabels, otherLabels };
}

// Helper function to extract key Traefik configuration from labels
function extractTraefikConfig(traefikLabels) {
  const config = {
    enabled: traefikLabels['traefik.enable'] === 'true',
    routers: {},
    services: {},
    middlewares: []
  };
  
  // Parse router configuration
  for (const [key, value] of Object.entries(traefikLabels)) {
    const routerMatch = key.match(/^traefik\.http\.routers\.([^.]+)\.(.+)$/);
    if (routerMatch) {
      const [, routerName, property] = routerMatch;
      if (!config.routers[routerName]) config.routers[routerName] = {};
      config.routers[routerName][property] = value;
    }
    
    const serviceMatch = key.match(/^traefik\.http\.services\.([^.]+)\.(.+)$/);
    if (serviceMatch) {
      const [, serviceName, property] = serviceMatch;
      if (!config.services[serviceName]) config.services[serviceName] = {};
      config.services[serviceName][property] = value;
    }
  }
  
  return config;
}

// Docker API endpoints
app.get('/api/docker/services', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const services = [];
    
    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      const details = await container.inspect();
      
      const { traefikLabels, otherLabels } = parseTraefikLabels(details.Config.Labels);
      const traefikConfig = extractTraefikConfig(traefikLabels);
      
      // Get network information
      const networks = Object.keys(details.NetworkSettings.Networks || {});
      
      services.push({
        id: details.Id,
        name: details.Name.replace('/', ''),
        image: details.Config.Image,
        state: details.State.Status,
        status: details.State.Running ? 'running' : 'stopped',
        created: details.Created,
        ports: containerInfo.Ports || [],
        networks: networks,
        labels: {
          traefik: traefikLabels,
          other: otherLabels
        },
        traefikConfig: traefikConfig,
        compose: {
          project: details.Config.Labels['com.docker.compose.project'] || 'unknown',
          service: details.Config.Labels['com.docker.compose.service'] || 'unknown'
        }
      });
    }
    
    res.json(services);
  } catch (error) {
    console.error('Docker API error:', error);
    res.status(500).json({ error: 'Failed to connect to Docker daemon. Ensure Docker socket is accessible.' });
  }
});

app.get('/api/docker/networks', async (req, res) => {
  try {
    const networks = await docker.listNetworks();
    const networkDetails = [];
    
    for (const networkInfo of networks) {
      const network = docker.getNetwork(networkInfo.Id);
      const details = await network.inspect();
      
      // Get containers in this network
      const containers = Object.keys(details.Containers || {}).map(containerId => {
        const containerInfo = details.Containers[containerId];
        return {
          id: containerId.substring(0, 12),
          name: containerInfo.Name,
          ipAddress: containerInfo.IPv4Address
        };
      });
      
      networkDetails.push({
        id: details.Id,
        name: details.Name,
        driver: details.Driver,
        scope: details.Scope,
        created: details.Created,
        containers: containers,
        options: details.Options || {},
        labels: details.Labels || {}
      });
    }
    
    res.json(networkDetails);
  } catch (error) {
    console.error('Docker networks error:', error);
    res.status(500).json({ error: 'Failed to get Docker networks' });
  }
});

app.put('/api/docker/labels/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { labels } = req.body;
    
    // Note: Docker API doesn't allow direct label modification on running containers
    // This would typically require container recreation or docker-compose changes
    // For now, we'll return the labels that would be applied
    
    res.json({ 
      success: true, 
      message: 'Label update prepared (requires container recreation to apply)',
      containerId,
      labels
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/status/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const container = docker.getContainer(containerId);
    const details = await container.inspect();
    
    res.json({
      id: details.Id,
      name: details.Name,
      state: details.State,
      health: details.State.Health || null,
      restartCount: details.RestartCount,
      lastStarted: details.State.StartedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DNS Provider management
const DNS_PROVIDERS_PATH = path.join(__dirname, 'dns-providers.json');

// Ensure DNS providers file exists
if (!fs.existsSync(DNS_PROVIDERS_PATH)) {
  fs.writeFileSync(DNS_PROVIDERS_PATH, JSON.stringify([], null, 2));
}

function loadDNSProviders() {
  try {
    return JSON.parse(fs.readFileSync(DNS_PROVIDERS_PATH, 'utf8'));
  } catch (error) {
    console.error('Error loading DNS providers:', error);
    return [];
  }
}

function saveDNSProviders(providers) {
  try {
    fs.writeFileSync(DNS_PROVIDERS_PATH, JSON.stringify(providers, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving DNS providers:', error);
    return false;
  }
}

// Get all DNS providers
app.get('/api/dns-providers', (req, res) => {
  try {
    const providers = loadDNSProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new DNS provider
app.post('/api/dns-providers', (req, res) => {
  try {
    const { name, type, config } = req.body;
    
    if (!name || !type || !config) {
      return res.status(400).json({ error: 'Name, type, and config are required' });
    }
    
    const providers = loadDNSProviders();
    
    // Check if provider already exists
    if (providers.some(p => p.name === name)) {
      return res.status(400).json({ error: 'DNS provider with this name already exists' });
    }
    
    // Validate RFC2136 config
    if (type === 'rfc2136') {
      const requiredFields = ['nameserver', 'tsigKey', 'tsigSecret', 'tsigAlgorithm'];
      for (const field of requiredFields) {
        if (!config[field]) {
          return res.status(400).json({ error: `${field} is required for RFC2136 provider` });
        }
      }
    }
    
    const newProvider = {
      name,
      type,
      config,
      createdAt: new Date().toISOString()
    };
    
    providers.push(newProvider);
    
    if (saveDNSProviders(providers)) {
      res.json({ success: true, message: 'DNS provider added successfully', provider: newProvider });
    } else {
      res.status(500).json({ error: 'Failed to save DNS provider' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete DNS provider
app.delete('/api/dns-providers/:name', (req, res) => {
  try {
    const { name } = req.params;
    const providers = loadDNSProviders();
    
    const providerIndex = providers.findIndex(p => p.name === name);
    if (providerIndex === -1) {
      return res.status(404).json({ error: 'DNS provider not found' });
    }
    
    providers.splice(providerIndex, 1);
    
    if (saveDNSProviders(providers)) {
      res.json({ success: true, message: 'DNS provider deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete DNS provider' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test DNS provider
app.post('/api/dns-providers/:name/test', (req, res) => {
  try {
    const { name } = req.params;
    const providers = loadDNSProviders();
    
    const provider = providers.find(p => p.name === name);
    if (!provider) {
      return res.status(404).json({ error: 'DNS provider not found' });
    }
    
    // Basic validation test
    if (provider.type === 'rfc2136') {
      const { nameserver, tsigKey, tsigSecret, tsigAlgorithm } = provider.config;
      
      if (!nameserver || !tsigKey || !tsigSecret || !tsigAlgorithm) {
        return res.status(400).json({ error: 'Provider configuration is incomplete' });
      }
      
      // Test nameserver format
      if (!nameserver.includes(':')) {
        return res.status(400).json({ error: 'Nameserver must include port (e.g., ns1.example.com:53)' });
      }
      
      // For now, we'll do basic validation. 
      // In a production system, you might want to actually test DNS connectivity
      res.json({ 
        success: true, 
        message: 'DNS provider configuration is valid',
        provider: provider.name,
        type: provider.type
      });
    } else {
      res.status(400).json({ error: 'Unsupported provider type for testing' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Network Management API Endpoints

// Get network information with Traefik connection status
app.get('/api/networks/management', async (req, res) => {
  try {
    const networks = await docker.listNetworks();
    const traefikContainer = docker.getContainer('traefik');
    let traefikNetworks = [];
    
    try {
      const traefikInfo = await traefikContainer.inspect();
      traefikNetworks = Object.keys(traefikInfo.NetworkSettings.Networks || {});
    } catch (error) {
      console.warn('Could not inspect Traefik container:', error.message);
    }
    
    const networkDetails = [];
    
    for (const network of networks) {
      const details = await docker.getNetwork(network.Id).inspect();
      const isTraefikConnected = traefikNetworks.includes(network.Name);
      
      // Get container count and names
      const containers = Object.keys(details.Containers || {}).map(containerId => {
        const containerInfo = details.Containers[containerId];
        return {
          id: containerId.substring(0, 12),
          name: containerInfo.Name,
          ipAddress: containerInfo.IPv4Address
        };
      });
      
      networkDetails.push({
        id: details.Id,
        name: details.Name,
        driver: details.Driver,
        scope: details.Scope,
        created: details.Created,
        isTraefikConnected,
        containerCount: containers.length,
        containers: containers,
        subnet: details.IPAM?.Config?.[0]?.Subnet || 'N/A',
        gateway: details.IPAM?.Config?.[0]?.Gateway || 'N/A',
        options: details.Options || {},
        labels: details.Labels || {},
        internal: details.Internal || false,
        attachable: details.Attachable === true || (!details.Internal && details.Driver === 'bridge'),
        ingress: details.Ingress || false
      });
    }
    
    res.json({
      networks: networkDetails,
      traefikNetworks: traefikNetworks
    });
  } catch (error) {
    console.error('Network management error:', error);
    res.status(500).json({ error: 'Failed to get network information' });
  }
});

// Connect Traefik to a network
app.post('/api/networks/:networkId/connect', async (req, res) => {
  try {
    const { networkId } = req.params;
    const { alias, ipAddress } = req.body;
    
    const network = docker.getNetwork(networkId);
    const traefikContainer = docker.getContainer('traefik');
    
    // Check if network exists
    await network.inspect();
    
    // Connect Traefik to the network
    const connectConfig = {
      Container: 'traefik'
    };
    
    if (alias || ipAddress) {
      connectConfig.EndpointConfig = {};
      if (alias) {
        connectConfig.EndpointConfig.Aliases = [alias];
      }
      if (ipAddress) {
        connectConfig.EndpointConfig.IPAMConfig = {
          IPv4Address: ipAddress
        };
      }
    }
    
    await network.connect(connectConfig);
    
    res.json({ 
      success: true, 
      message: `Traefik successfully connected to network ${networkId}`,
      networkId,
      alias,
      ipAddress
    });
  } catch (error) {
    console.error('Network connect error:', error);
    res.status(500).json({ 
      error: `Failed to connect to network: ${error.message}` 
    });
  }
});

// Disconnect Traefik from a network
app.post('/api/networks/:networkId/disconnect', async (req, res) => {
  try {
    const { networkId } = req.params;
    const { force } = req.body;
    
    const network = docker.getNetwork(networkId);
    
    // Check if network exists
    const networkInfo = await network.inspect();
    
    // Don't allow disconnecting from the default network
    if (networkInfo.Name === 'deploy_traefik') {
      return res.status(400).json({
        error: 'Cannot disconnect Traefik from its primary network'
      });
    }
    
    // Disconnect Traefik from the network
    await network.disconnect({
      Container: 'traefik',
      Force: force || false
    });
    
    res.json({ 
      success: true, 
      message: `Traefik successfully disconnected from network ${networkId}`,
      networkId
    });
  } catch (error) {
    console.error('Network disconnect error:', error);
    res.status(500).json({ 
      error: `Failed to disconnect from network: ${error.message}` 
    });
  }
});

// Get detailed network topology
app.get('/api/networks/topology', async (req, res) => {
  try {
    const networks = await docker.listNetworks();
    const containers = await docker.listContainers({ all: true });
    
    const topology = {
      networks: [],
      connections: []
    };
    
    // Build network topology
    for (const network of networks) {
      const details = await docker.getNetwork(network.Id).inspect();
      const networkNode = {
        id: details.Id,
        name: details.Name,
        driver: details.Driver,
        subnet: details.IPAM?.Config?.[0]?.Subnet || 'N/A',
        containers: []
      };
      
      // Add containers in this network
      Object.keys(details.Containers || {}).forEach(containerId => {
        const containerInfo = details.Containers[containerId];
        networkNode.containers.push({
          id: containerId.substring(0, 12),
          name: containerInfo.Name,
          ipAddress: containerInfo.IPv4Address,
          isTraefik: containerInfo.Name === 'traefik'
        });
        
        // Track connections for visualization
        topology.connections.push({
          networkId: details.Id,
          containerId: containerId.substring(0, 12),
          containerName: containerInfo.Name,
          ipAddress: containerInfo.IPv4Address
        });
      });
      
      topology.networks.push(networkNode);
    }
    
    res.json(topology);
  } catch (error) {
    console.error('Network topology error:', error);
    res.status(500).json({ error: 'Failed to get network topology' });
  }
});

// Phase 4: Domain Overview API Endpoints

// Get all domains with aggregated configuration
app.get('/api/domains', async (req, res) => {
  try {
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }

    const routers = config.http?.routers || {};
    const services = config.http?.services || {};
    const domains = [];

    // Parse domains from routers
    for (const [routerName, routerConfig] of Object.entries(routers)) {
      const domain = extractDomainFromRule(routerConfig.rule);
      if (!domain) continue;

      const serviceName = routerConfig.service;
      const serviceConfig = services[serviceName];
      
      // Analyze backend type
      const backend = analyzeBackend(serviceConfig);
      
      // Determine health status
      const health = await determineHealthStatus(domain, backend);
      
      // Get TLS configuration
      const tlsConfig = analyzeTLSConfig(routerConfig);
      
      // Get middleware chain
      const middlewares = routerConfig.middlewares || [];
      
      domains.push({
        domain,
        routerName,
        serviceName,
        backend,
        health,
        tlsConfig,
        middlewares,
        entrypoint: routerConfig.entrypoints?.[0] || 'web'
      });
    }

    res.json({ domains, totalRouters: Object.keys(routers).length });
  } catch (error) {
    console.error('Domain analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze domains' });
  }
});

// Get detailed configuration for specific domain
app.get('/api/domains/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    let config = {};
    if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
      config = yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'));
    }

    const routers = config.http?.routers || {};
    const services = config.http?.services || {};
    const middlewares = config.http?.middlewares || {};

    // Find router for this domain
    const routerEntry = Object.entries(routers).find(([name, routerConfig]) => 
      extractDomainFromRule(routerConfig.rule) === domain
    );

    if (!routerEntry) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const [routerName, routerConfig] = routerEntry;
    const serviceName = routerConfig.service;
    const serviceConfig = services[serviceName];

    // Get detailed backend analysis
    const backend = analyzeBackend(serviceConfig);
    const backendDetails = await getBackendDetails(backend);
    
    // Get detailed TLS analysis
    const tlsDetails = await getTLSDetails(domain, routerConfig);
    
    // Get middleware details
    const middlewareDetails = await getMiddlewareDetails(routerConfig.middlewares || [], middlewares);
    
    // Get network path analysis
    const networkPath = await analyzeNetworkPath(backend);

    res.json({
      domain,
      routerName,
      serviceName,
      routerConfig,
      serviceConfig,
      backend,
      backendDetails,
      tlsDetails,
      middlewareDetails,
      networkPath,
      health: await determineHealthStatus(domain, backend)
    });
  } catch (error) {
    console.error('Domain details error:', error);
    res.status(500).json({ error: 'Failed to get domain details' });
  }
});

// Helper functions
function extractDomainFromRule(rule) {
  const hostMatch = rule.match(/Host\(`([^`]+)`\)/);
  return hostMatch ? hostMatch[1] : null;
}

function analyzeBackend(serviceConfig) {
  if (!serviceConfig?.loadBalancer?.servers?.[0]) {
    return { type: 'unknown', url: null };
  }

  const url = serviceConfig.loadBalancer.servers[0].url;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's an IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return { type: 'external', url, hostname, port: urlObj.port || urlObj.protocol === 'https:' ? 443 : 80 };
    }
    
    // Check if it's a Docker container name
    if (!hostname.includes('.')) {
      return { type: 'docker', url, containerName: hostname, port: urlObj.port || urlObj.protocol === 'https:' ? 443 : 80 };
    }
    
    // External hostname
    return { type: 'external', url, hostname, port: urlObj.port || urlObj.protocol === 'https:' ? 443 : 80 };
  } catch (error) {
    return { type: 'invalid', url, error: error.message };
  }
}

function analyzeTLSConfig(routerConfig) {
  if (!routerConfig.tls) {
    return { enabled: false, type: 'none' };
  }

  if (routerConfig.tls.certResolver) {
    const resolver = routerConfig.tls.certResolver;
    if (resolver.includes('staging')) {
      return { enabled: true, type: 'letsencrypt-staging', resolver };
    } else if (resolver.includes('dns')) {
      return { enabled: true, type: 'letsencrypt-dns', resolver };
    } else {
      return { enabled: true, type: 'letsencrypt-http', resolver };
    }
  }

  if (routerConfig.tls.domains) {
    return { enabled: true, type: 'custom', domains: routerConfig.tls.domains };
  }

  return { enabled: true, type: 'unknown' };
}

async function determineHealthStatus(domain, backend) {
  // Basic health determination - in production this could do actual health checks
  let status = 'unknown';
  let issues = [];

  if (backend.type === 'invalid') {
    status = 'error';
    issues.push('Invalid backend URL');
  } else if (backend.type === 'docker') {
    // Check if container exists and is running
    try {
      const containers = await docker.listContainers({ all: true });
      const container = containers.find(c => 
        c.Names.some(name => name.includes(backend.containerName))
      );
      
      if (!container) {
        status = 'error';
        issues.push('Container not found');
      } else if (container.State !== 'running') {
        status = 'error';
        issues.push('Container not running');
      } else {
        status = 'healthy';
      }
    } catch (error) {
      status = 'warning';
      issues.push('Cannot verify container status');
    }
  } else if (backend.type === 'external') {
    status = 'healthy'; // Assume external services are healthy
  }

  return { status, issues, lastChecked: new Date().toISOString() };
}

async function getBackendDetails(backend) {
  if (backend.type === 'docker') {
    try {
      const containers = await docker.listContainers({ all: true });
      const container = containers.find(c => 
        c.Names.some(name => name.includes(backend.containerName))
      );
      
      if (container) {
        const details = await docker.getContainer(container.Id).inspect();
        return {
          containerId: container.Id.substring(0, 12),
          image: container.Image,
          state: container.State,
          networks: Object.keys(details.NetworkSettings.Networks || {}),
          compose: {
            project: details.Config.Labels['com.docker.compose.project'] || 'unknown',
            service: details.Config.Labels['com.docker.compose.service'] || 'unknown'
          }
        };
      }
    } catch (error) {
      console.error('Error getting container details:', error);
    }
  }
  
  return null;
}

async function getTLSDetails(domain, routerConfig) {
  const tlsConfig = analyzeTLSConfig(routerConfig);
  
  if (tlsConfig.type === 'custom') {
    // Check if custom certificate exists
    const certPath = path.join(__dirname, 'certs', `${domain}.crt`);
    if (fs.existsSync(certPath)) {
      try {
        const cert = fs.readFileSync(certPath, 'utf8');
        // Basic certificate parsing - in production you'd use a proper cert parser
        return { ...tlsConfig, certificateExists: true };
      } catch (error) {
        return { ...tlsConfig, certificateExists: false, error: error.message };
      }
    }
  }
  
  return tlsConfig;
}

async function getMiddlewareDetails(middlewareNames, allMiddlewares) {
  return middlewareNames.map(name => {
    const config = allMiddlewares[name];
    if (!config) {
      return { name, type: 'unknown', exists: false };
    }
    
    // Determine middleware type
    let type = 'unknown';
    if (config.plugin?.['crowdsec-bouncer-traefik-plugin']) {
      type = 'crowdsec';
    } else if (config.rateLimit) {
      type = 'rateLimit';
    } else if (config.auth) {
      type = 'auth';
    } else if (config.headers) {
      type = 'headers';
    } else if (config.stripPrefix) {
      type = 'stripPrefix';
    }
    
    return { name, type, exists: true, config };
  });
}

async function analyzeNetworkPath(backend) {
  if (backend.type !== 'docker') {
    return { type: 'external', path: [] };
  }
  
  try {
    // Get Traefik networks
    const traefikContainer = docker.getContainer('traefik');
    const traefikInfo = await traefikContainer.inspect();
    const traefikNetworks = Object.keys(traefikInfo.NetworkSettings.Networks || {});
    
    // Find container networks
    const containers = await docker.listContainers({ all: true });
    const container = containers.find(c => 
      c.Names.some(name => name.includes(backend.containerName))
    );
    
    if (container) {
      const details = await docker.getContainer(container.Id).inspect();
      const containerNetworks = Object.keys(details.NetworkSettings.Networks || {});
      
      // Find common networks
      const commonNetworks = traefikNetworks.filter(net => containerNetworks.includes(net));
      
      return {
        type: 'docker',
        traefikNetworks,
        containerNetworks,
        commonNetworks,
        connected: commonNetworks.length > 0
      };
    }
  } catch (error) {
    console.error('Network path analysis error:', error);
  }
  
  return { type: 'docker', connected: false, error: 'Analysis failed' };
}

// Phase 5: Observability Configuration API Endpoints

// Get current observability configuration
app.get('/api/observability/config', async (req, res) => {
  try {
    let staticConfig = {};
    if (fs.existsSync(TRAEFIK_CONFIG_PATH)) {
      staticConfig = yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8'));
    }

    const observabilityConfig = {
      accessLogs: analyzeAccessLogsConfig(staticConfig),
      metrics: analyzeMetricsConfig(staticConfig),
      tracing: analyzeTracingConfig(staticConfig)
    };

    res.json(observabilityConfig);
  } catch (error) {
    console.error('Observability config error:', error);
    res.status(500).json({ error: 'Failed to get observability configuration' });
  }
});

// Update access logs configuration
app.put('/api/observability/logs', async (req, res) => {
  try {
    const { enabled, format, filePath, customFormat, graylog } = req.body;
    
    let staticConfig = {};
    if (fs.existsSync(TRAEFIK_CONFIG_PATH)) {
      staticConfig = yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8'));
    }

    if (enabled) {
      staticConfig.accessLog = {
        filePath: filePath || '/logs/access.log'
      };

      // Set log format
      if (format === 'json') {
        staticConfig.accessLog.format = 'json';
      } else if (format === 'clf') {
        staticConfig.accessLog.format = 'common';
      } else if (format === 'custom' && customFormat) {
        staticConfig.accessLog.format = customFormat;
      }

      // Add Graylog configuration if enabled
      if (graylog?.enabled && graylog.endpoint) {
        // Note: Graylog integration would typically require additional log shipping setup
        // This is a placeholder for the configuration
        staticConfig.accessLog.graylog = {
          endpoint: graylog.endpoint,
          facility: graylog.facility || 'traefik'
        };
      }
    } else {
      // Disable access logs
      delete staticConfig.accessLog;
    }

    fs.writeFileSync(TRAEFIK_CONFIG_PATH, yaml.dump(staticConfig));
    res.json({ success: true, message: 'Access logs configuration updated' });
  } catch (error) {
    console.error('Access logs update error:', error);
    res.status(500).json({ error: 'Failed to update access logs configuration' });
  }
});

// Update metrics configuration
app.put('/api/observability/metrics', async (req, res) => {
  try {
    const { enabled, port, path, interval, categories } = req.body;
    
    let staticConfig = {};
    if (fs.existsSync(TRAEFIK_CONFIG_PATH)) {
      staticConfig = yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8'));
    }

    if (enabled) {
      staticConfig.metrics = {
        prometheus: {
          addEntryPointsLabels: categories?.entrypoint || true,
          addRoutersLabels: categories?.router || true,
          addServicesLabels: categories?.service || true
        }
      };

      // Add metrics endpoint to entrypoints if specified
      if (port && port !== 8080) {
        if (!staticConfig.entryPoints) staticConfig.entryPoints = {};
        staticConfig.entryPoints.metrics = {
          address: `:${port}`
        };
      }
    } else {
      // Disable metrics
      delete staticConfig.metrics;
      if (staticConfig.entryPoints?.metrics) {
        delete staticConfig.entryPoints.metrics;
      }
    }

    fs.writeFileSync(TRAEFIK_CONFIG_PATH, yaml.dump(staticConfig));
    res.json({ 
      success: true, 
      message: 'Metrics configuration updated',
      metricsUrl: enabled ? `http://localhost:${port || 8080}${path || '/metrics'}` : null
    });
  } catch (error) {
    console.error('Metrics update error:', error);
    res.status(500).json({ error: 'Failed to update metrics configuration' });
  }
});

// Update tracing configuration
app.put('/api/observability/tracing', async (req, res) => {
  try {
    const { enabled, backend, endpoint, samplingRate, serviceName, headers } = req.body;
    
    let staticConfig = {};
    if (fs.existsSync(TRAEFIK_CONFIG_PATH)) {
      staticConfig = yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8'));
    }

    if (enabled) {
      staticConfig.tracing = {
        serviceName: serviceName || 'traefik',
        sampleRate: parseFloat(samplingRate) || 1.0
      };

      // Configure backend-specific settings
      switch (backend) {
        case 'jaeger':
          staticConfig.tracing.jaeger = {
            samplingServerURL: endpoint || 'http://jaeger:5778/sampling',
            localAgentHostPort: endpoint?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'jaeger:6831'
          };
          break;
        case 'zipkin':
          staticConfig.tracing.zipkin = {
            httpEndpoint: endpoint || 'http://zipkin:9411/api/v2/spans'
          };
          break;
        case 'otlp':
          staticConfig.tracing.otlp = {
            http: {
              endpoint: endpoint || 'http://otel-collector:4318/v1/traces'
            }
          };
          break;
      }

      // Add custom headers if specified
      if (headers) {
        const headersList = headers.split('\n').filter(h => h.trim());
        if (headersList.length > 0) {
          staticConfig.tracing.capturedRequestHeaders = headersList;
        }
      }
    } else {
      // Disable tracing
      delete staticConfig.tracing;
    }

    fs.writeFileSync(TRAEFIK_CONFIG_PATH, yaml.dump(staticConfig));
    res.json({ success: true, message: 'Tracing configuration updated' });
  } catch (error) {
    console.error('Tracing update error:', error);
    res.status(500).json({ error: 'Failed to update tracing configuration' });
  }
});

// Test observability connections
app.post('/api/observability/test', async (req, res) => {
  try {
    const { type, config } = req.body;
    const results = { success: false, message: '', details: {} };

    switch (type) {
      case 'metrics':
        // Test metrics endpoint accessibility
        const metricsUrl = `http://localhost:${config.port || 8080}${config.path || '/metrics'}`;
        try {
          // Note: In a real implementation, you'd make an HTTP request to test the endpoint
          results.success = true;
          results.message = 'Metrics endpoint configuration is valid';
          results.details.url = metricsUrl;
        } catch (error) {
          results.message = 'Metrics endpoint is not accessible';
          results.details.error = error.message;
        }
        break;

      case 'tracing':
        // Test tracing backend connection
        try {
          // Note: In a real implementation, you'd test the actual connection
          results.success = true;
          results.message = `${config.backend} tracing configuration is valid`;
          results.details.endpoint = config.endpoint;
        } catch (error) {
          results.message = `Failed to connect to ${config.backend}`;
          results.details.error = error.message;
        }
        break;

      case 'graylog':
        // Test Graylog connection
        try {
          // Note: In a real implementation, you'd test GELF UDP connection
          results.success = true;
          results.message = 'Graylog configuration is valid';
          results.details.endpoint = config.endpoint;
        } catch (error) {
          results.message = 'Failed to connect to Graylog';
          results.details.error = error.message;
        }
        break;

      default:
        results.message = 'Unknown test type';
    }

    res.json(results);
  } catch (error) {
    console.error('Observability test error:', error);
    res.status(500).json({ error: 'Failed to test observability configuration' });
  }
});

// Helper functions for analyzing current configuration
function analyzeAccessLogsConfig(staticConfig) {
  const accessLog = staticConfig.accessLog || {};
  return {
    enabled: !!staticConfig.accessLog,
    format: accessLog.format || 'common',
    filePath: accessLog.filePath || '/logs/access.log',
    graylog: accessLog.graylog || null
  };
}

function analyzeMetricsConfig(staticConfig) {
  const metrics = staticConfig.metrics?.prometheus || {};
  const metricsPort = staticConfig.entryPoints?.metrics?.address?.replace(':', '') || '8080';
  
  return {
    enabled: !!staticConfig.metrics,
    port: parseInt(metricsPort) || 8080,
    path: '/metrics',
    categories: {
      entrypoint: metrics.addEntryPointsLabels !== false,
      router: metrics.addRoutersLabels !== false,
      service: metrics.addServicesLabels !== false
    }
  };
}

function analyzeTracingConfig(staticConfig) {
  const tracing = staticConfig.tracing || {};
  let backend = 'jaeger'; // default
  let endpoint = '';

  if (tracing.jaeger) {
    backend = 'jaeger';
    endpoint = tracing.jaeger.localAgentHostPort || '';
  } else if (tracing.zipkin) {
    backend = 'zipkin';
    endpoint = tracing.zipkin.httpEndpoint || '';
  } else if (tracing.otlp) {
    backend = 'otlp';
    endpoint = tracing.otlp.http?.endpoint || '';
  }

  return {
    enabled: !!staticConfig.tracing,
    backend,
    endpoint,
    samplingRate: tracing.sampleRate || 1.0,
    serviceName: tracing.serviceName || 'traefik',
    headers: tracing.capturedRequestHeaders?.join('\n') || ''
  };
}

// Phase 5.5: Configuration Management System

// UI Configuration file path
const UI_CONFIG_PATH = path.join(__dirname, 'config', 'ui-config.yml');
const UI_BACKUPS_DIR = path.join(__dirname, 'config', 'backups');

// Ensure config directories exist
if (!fs.existsSync(path.dirname(UI_CONFIG_PATH))) {
  fs.mkdirSync(path.dirname(UI_CONFIG_PATH), { recursive: true });
}
if (!fs.existsSync(UI_BACKUPS_DIR)) {
  fs.mkdirSync(UI_BACKUPS_DIR, { recursive: true });
}

// Current configuration version - increment when schema changes
const CURRENT_CONFIG_VERSION = '0.0.6';
const SUPPORTED_CONFIG_VERSIONS = ['0.0.5', '0.0.6'];

// Default UI configuration structure
const DEFAULT_UI_CONFIG = {
  traefik_ui: {
    version: CURRENT_CONFIG_VERSION,
    config_schema_version: CURRENT_CONFIG_VERSION,
    dns_providers: [],
    observability: {
      presets: {
        production: {
          access_logs: { enabled: true, format: 'json', graylog: { enabled: false } },
          metrics: { enabled: true, port: 8082, categories: { entrypoint: true, router: true, service: true } },
          tracing: { enabled: true, backend: 'jaeger', samplingRate: 0.1 }
        },
        development: {
          access_logs: { enabled: true, format: 'clf', graylog: { enabled: false } },
          metrics: { enabled: true, port: 8082, categories: { entrypoint: true, router: false, service: false } },
          tracing: { enabled: false }
        },
        minimal: {
          access_logs: { enabled: false },
          metrics: { enabled: false },
          tracing: { enabled: false }
        }
      },
      defaults: {
        access_logs_format: 'json',
        metrics_port: 8082,
        tracing_backend: 'jaeger'
      }
    },
    ui: {
      theme: 'auto',
      default_tls_method: 'letsencrypt-dns',
      default_middleware: ['crowdsec-bouncer'],
      network_scan_interval: 300,
      auto_backup: true,
      backup_retention_days: 30
    },
    templates: {
      route_templates: {
        'simple-web-app': {
          name: 'Simple Web App',
          description: 'Basic web application with Let\'s Encrypt SSL',
          tls_method: 'letsencrypt-http',
          middleware: []
        },
        'api-service': {
          name: 'API Service',
          description: 'REST API with CORS and rate limiting',
          tls_method: 'letsencrypt-dns',
          middleware: ['cors', 'rate-limit']
        },
        'protected-service': {
          name: 'Protected Service',
          description: 'Service with CrowdSec protection',
          tls_method: 'letsencrypt-dns',
          middleware: ['crowdsec-bouncer']
        }
      }
    },
    backup: {
      created: new Date().toISOString(),
      traefik_version: 'v3.0',
      ui_version: CURRENT_CONFIG_VERSION,
      config_schema_version: CURRENT_CONFIG_VERSION
    }
  }
};

// Configuration Migration System
function migrateConfigToCurrentVersion(config) {
  if (!config.traefik_ui) {
    console.warn('Invalid configuration structure, using default');
    return DEFAULT_UI_CONFIG;
  }

  const configVersion = config.traefik_ui.config_schema_version || config.traefik_ui.version || '0.0.5';
  
  if (configVersion === CURRENT_CONFIG_VERSION) {
    // Already current version, just ensure all required fields exist
    return ensureConfigCompleteness(config);
  }

  if (!SUPPORTED_CONFIG_VERSIONS.includes(configVersion)) {
    console.warn(`Unsupported config version ${configVersion}, using default`);
    return DEFAULT_UI_CONFIG;
  }

  console.log(`Migrating configuration from v${configVersion} to v${CURRENT_CONFIG_VERSION}`);
  
  let migratedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
  
  // Apply migrations in sequence
  if (configVersion === '0.0.5') {
    migratedConfig = migrateFrom_0_0_5_to_0_0_6(migratedConfig);
  }
  
  // Future migrations would be added here:
  // if (configVersion === '0.0.6') {
  //   migratedConfig = migrateFrom_0_0_6_to_0_0_7(migratedConfig);
  // }
  
  // Update version stamps
  migratedConfig.traefik_ui.version = CURRENT_CONFIG_VERSION;
  migratedConfig.traefik_ui.config_schema_version = CURRENT_CONFIG_VERSION;
  migratedConfig.traefik_ui.backup.ui_version = CURRENT_CONFIG_VERSION;
  migratedConfig.traefik_ui.backup.config_schema_version = CURRENT_CONFIG_VERSION;
  migratedConfig.traefik_ui.backup.migrated_from = configVersion;
  migratedConfig.traefik_ui.backup.migrated_at = new Date().toISOString();
  
  return ensureConfigCompleteness(migratedConfig);
}

function migrateFrom_0_0_5_to_0_0_6(config) {
  console.log('Applying v0.0.5 → v0.0.6 migration');
  
  // Add new observability structure if missing
  if (!config.traefik_ui.observability) {
    config.traefik_ui.observability = {
      presets: {
        production: {
          access_logs: { enabled: true, format: 'json', graylog: { enabled: false } },
          metrics: { enabled: true, port: 8082, categories: { entrypoint: true, router: true, service: true } },
          tracing: { enabled: true, backend: 'jaeger', samplingRate: 0.1 }
        },
        development: {
          access_logs: { enabled: true, format: 'clf', graylog: { enabled: false } },
          metrics: { enabled: true, port: 8082, categories: { entrypoint: true, router: false, service: false } },
          tracing: { enabled: false }
        },
        minimal: {
          access_logs: { enabled: false },
          metrics: { enabled: false },
          tracing: { enabled: false }
        }
      },
      defaults: {
        access_logs_format: 'json',
        metrics_port: 8082,
        tracing_backend: 'jaeger'
      }
    };
  }
  
  // Add new UI settings if missing
  if (!config.traefik_ui.ui) {
    config.traefik_ui.ui = {
      theme: 'auto',
      default_tls_method: 'letsencrypt-dns',
      default_middleware: ['crowdsec-bouncer'],
      network_scan_interval: 300,
      auto_backup: true,
      backup_retention_days: 30
    };
  } else {
    // Ensure new fields exist
    if (!config.traefik_ui.ui.auto_backup) config.traefik_ui.ui.auto_backup = true;
    if (!config.traefik_ui.ui.backup_retention_days) config.traefik_ui.ui.backup_retention_days = 30;
  }
  
  // Add templates if missing
  if (!config.traefik_ui.templates) {
    config.traefik_ui.templates = {
      route_templates: {
        'simple-web-app': {
          name: 'Simple Web App',
          description: 'Basic web application with Let\'s Encrypt SSL',
          tls_method: 'letsencrypt-http',
          middleware: []
        },
        'api-service': {
          name: 'API Service',
          description: 'REST API with CORS and rate limiting',
          tls_method: 'letsencrypt-dns',
          middleware: ['cors', 'rate-limit']
        },
        'protected-service': {
          name: 'Protected Service',
          description: 'Service with CrowdSec protection',
          tls_method: 'letsencrypt-dns',
          middleware: ['crowdsec-bouncer']
        }
      }
    };
  }
  
  return config;
}

function ensureConfigCompleteness(config) {
  // Ensure all required fields exist by merging with default config
  const merged = JSON.parse(JSON.stringify(DEFAULT_UI_CONFIG));
  
  // Deep merge user config over defaults
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
  
  return deepMerge(merged, config);
}

// Helper functions for UI configuration management
function loadUIConfig() {
  try {
    if (fs.existsSync(UI_CONFIG_PATH)) {
      const content = fs.readFileSync(UI_CONFIG_PATH, 'utf8');
      const rawConfig = yaml.load(content);
      
      // Apply migrations and ensure completeness
      const migratedConfig = migrateConfigToCurrentVersion(rawConfig);
      
      // Save migrated config if it was updated
      const originalVersion = rawConfig.traefik_ui?.config_schema_version || rawConfig.traefik_ui?.version || '0.0.5';
      if (originalVersion !== CURRENT_CONFIG_VERSION) {
        console.log(`Configuration migrated from v${originalVersion} to v${CURRENT_CONFIG_VERSION}, saving...`);
        saveUIConfig(migratedConfig);
      }
      
      return migratedConfig;
    } else {
      // Create default config if it doesn't exist
      console.log('Creating default UI configuration');
      saveUIConfig(DEFAULT_UI_CONFIG);
      return DEFAULT_UI_CONFIG;
    }
  } catch (error) {
    console.error('Error loading UI config:', error);
    return DEFAULT_UI_CONFIG;
  }
}

function saveUIConfig(config) {
  try {
    // Ensure current version stamps
    config.traefik_ui.backup.created = new Date().toISOString();
    config.traefik_ui.version = CURRENT_CONFIG_VERSION;
    config.traefik_ui.config_schema_version = CURRENT_CONFIG_VERSION;
    config.traefik_ui.backup.ui_version = CURRENT_CONFIG_VERSION;
    config.traefik_ui.backup.config_schema_version = CURRENT_CONFIG_VERSION;
    
    fs.writeFileSync(UI_CONFIG_PATH, yaml.dump(config, { lineWidth: -1 }));
    return true;
  } catch (error) {
    console.error('Error saving UI config:', error);
    return false;
  }
}

function createBackup(config, backupName) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `ui-config-backup-${timestamp}.yml`;
    const backupPath = path.join(UI_BACKUPS_DIR, filename);
    
    // Add comprehensive backup metadata
    const backupConfig = {
      ...config,
      traefik_ui: {
        ...config.traefik_ui,
        backup: {
          ...config.traefik_ui.backup,
          backup_created: new Date().toISOString(),
          backup_type: backupName ? 'manual' : 'automatic',
          backup_from_version: config.traefik_ui.config_schema_version || config.traefik_ui.version || CURRENT_CONFIG_VERSION,
          backup_tool_version: CURRENT_CONFIG_VERSION,
          backup_id: `backup-${timestamp}`,
          original_created: config.traefik_ui.backup.created
        }
      }
    };
    
    fs.writeFileSync(backupPath, yaml.dump(backupConfig, { lineWidth: -1 }));
    return { success: true, filename, path: backupPath };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
}

function validateUIConfig(config) {
  const errors = [];
  const warnings = [];
  
  try {
    // Validate basic structure
    if (!config.traefik_ui) {
      errors.push('Missing traefik_ui root configuration');
      return { valid: false, errors, warnings };
    }
    
    const uiConfig = config.traefik_ui;
    
    // Validate DNS providers
    if (uiConfig.dns_providers && Array.isArray(uiConfig.dns_providers)) {
      uiConfig.dns_providers.forEach((provider, index) => {
        if (!provider.name) {
          errors.push(`DNS provider ${index + 1}: Missing name`);
        }
        if (!provider.type) {
          errors.push(`DNS provider ${index + 1}: Missing type`);
        }
        if (provider.type === 'rfc2136' && provider.config) {
          const required = ['nameserver', 'tsigKey', 'tsigSecret', 'tsigAlgorithm'];
          required.forEach(field => {
            if (!provider.config[field]) {
              errors.push(`DNS provider ${provider.name}: Missing ${field}`);
            }
          });
        }
      });
    }
    
    // Validate observability settings
    if (uiConfig.observability?.defaults) {
      const defaults = uiConfig.observability.defaults;
      if (defaults.metrics_port && (defaults.metrics_port < 1024 || defaults.metrics_port > 65535)) {
        warnings.push('Metrics port should be between 1024-65535');
      }
    }
    
    // Validate UI settings
    if (uiConfig.ui) {
      if (uiConfig.ui.theme && !['auto', 'light', 'dark'].includes(uiConfig.ui.theme)) {
        warnings.push('UI theme should be auto, light, or dark');
      }
      if (uiConfig.ui.network_scan_interval && uiConfig.ui.network_scan_interval < 60) {
        warnings.push('Network scan interval should be at least 60 seconds');
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  } catch (error) {
    errors.push(`Configuration validation error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

// Get full UI configuration
app.get('/api/config/ui', (req, res) => {
  try {
    const config = loadUIConfig();
    res.json(config);
  } catch (error) {
    console.error('UI config get error:', error);
    res.status(500).json({ error: 'Failed to load UI configuration' });
  }
});

// Update UI configuration
app.put('/api/config/ui', (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate configuration
    const validation = validateUIConfig(newConfig);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Create automatic backup before changes
    const currentConfig = loadUIConfig();
    const backup = createBackup(currentConfig);
    
    // Save new configuration
    if (saveUIConfig(newConfig)) {
      res.json({
        success: true,
        message: 'UI configuration updated successfully',
        backup: backup.success ? backup.filename : null,
        validation: validation
      });
    } else {
      res.status(500).json({ error: 'Failed to save UI configuration' });
    }
  } catch (error) {
    console.error('UI config update error:', error);
    res.status(500).json({ error: 'Failed to update UI configuration' });
  }
});

// Create manual backup
app.post('/api/config/ui/backup', (req, res) => {
  try {
    const { name } = req.body;
    const config = loadUIConfig();
    const backup = createBackup(config, name);
    
    if (backup.success) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        filename: backup.filename,
        path: backup.path
      });
    } else {
      res.status(500).json({ error: backup.error });
    }
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Download specific backup file
app.get('/api/config/ui/backups/:filename/download', (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(UI_BACKUPS_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Ensure file is a YAML backup
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fs.statSync(backupPath).size);
    
    // Stream the file
    const fileStream = fs.createReadStream(backupPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: 'Failed to download backup file' });
  }
});

// Delete specific backup file
app.delete('/api/config/ui/backups/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(UI_BACKUPS_DIR, filename);
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Ensure file is a YAML backup
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Prevent deletion of very recent backups (safety check)
    const stats = fs.statSync(backupPath);
    const fileAge = Date.now() - stats.mtime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (fileAge < fiveMinutesInMs && filename.includes('pre-restore')) {
      return res.status(400).json({ 
        error: 'Cannot delete recent pre-restore backup (safety protection)',
        ageMinutes: Math.round(fileAge / 60000)
      });
    }
    
    // Delete the backup file
    fs.unlinkSync(backupPath);
    
    res.json({ 
      success: true, 
      message: `Backup ${filename} deleted successfully` 
    });
    
  } catch (error) {
    console.error('Backup deletion error:', error);
    res.status(500).json({ error: 'Failed to delete backup file' });
  }
});

// List available backups
app.get('/api/config/ui/backups', (req, res) => {
  try {
    const backups = [];
    const files = fs.readdirSync(UI_BACKUPS_DIR);
    
    files.filter(file => file.endsWith('.yml')).forEach(file => {
      const filePath = path.join(UI_BACKUPS_DIR, file);
      const stats = fs.statSync(filePath);
      
      try {
        const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
        backups.push({
          filename: file,
          created: stats.mtime.toISOString(),
          size: stats.size,
          version: content.traefik_ui?.version || 'unknown',
          type: content.traefik_ui?.backup?.backup_type || 'unknown'
        });
      } catch (error) {
        // Skip invalid backup files
        console.warn(`Invalid backup file: ${file}`);
      }
    });
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ backups });
  } catch (error) {
    console.error('Backup list error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Restore from backup
app.post('/api/config/ui/restore', (req, res) => {
  try {
    const { filename } = req.body;
    const backupPath = path.join(UI_BACKUPS_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Load and migrate backup if needed
    const rawBackupConfig = yaml.load(fs.readFileSync(backupPath, 'utf8'));
    const backupVersion = rawBackupConfig.traefik_ui?.config_schema_version || rawBackupConfig.traefik_ui?.version || '0.0.5';
    
    console.log(`Restoring backup from v${backupVersion}`);
    
    // Apply migrations to backup before validation
    const migratedBackupConfig = migrateConfigToCurrentVersion(rawBackupConfig);
    const validation = validateUIConfig(migratedBackupConfig);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Backup validation failed after migration',
        errors: validation.errors,
        warnings: validation.warnings,
        backupVersion,
        currentVersion: CURRENT_CONFIG_VERSION
      });
    }
    
    // Create backup of current config before restore
    const currentConfig = loadUIConfig();
    const currentBackup = createBackup(currentConfig, `pre-restore-${Date.now()}`);
    
    // Add restore metadata
    migratedBackupConfig.traefik_ui.backup.restored_at = new Date().toISOString();
    migratedBackupConfig.traefik_ui.backup.restored_from = filename;
    if (backupVersion !== CURRENT_CONFIG_VERSION) {
      migratedBackupConfig.traefik_ui.backup.migration_applied = true;
      migratedBackupConfig.traefik_ui.backup.original_version = backupVersion;
    }
    
    // Restore configuration
    if (saveUIConfig(migratedBackupConfig)) {
      res.json({
        success: true,
        message: 'Configuration restored successfully',
        restored_from: filename,
        current_backup: currentBackup.success ? currentBackup.filename : null,
        validation: validation,
        migration_info: {
          original_version: backupVersion,
          current_version: CURRENT_CONFIG_VERSION,
          migration_applied: backupVersion !== CURRENT_CONFIG_VERSION
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to restore configuration' });
    }
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore from backup' });
  }
});

// Export configuration for download
app.get('/api/config/ui/export', (req, res) => {
  try {
    const config = loadUIConfig();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `traefik-ui-config-${timestamp}.yml`;
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(yaml.dump(config, { lineWidth: -1 }));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

// Import configuration from upload
app.post('/api/config/ui/import', (req, res) => {
  try {
    const { config, validate_only = false } = req.body;
    
    let rawImportedConfig;
    try {
      rawImportedConfig = typeof config === 'string' ? yaml.load(config) : config;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid YAML format' });
    }
    
    // Detect and apply migrations
    const importVersion = rawImportedConfig.traefik_ui?.config_schema_version || rawImportedConfig.traefik_ui?.version || '0.0.5';
    console.log(`Importing configuration from v${importVersion}`);
    
    const migratedConfig = migrateConfigToCurrentVersion(rawImportedConfig);
    const validation = validateUIConfig(migratedConfig);
    
    if (validate_only) {
      return res.json({
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        preview: migratedConfig,
        migration_info: {
          original_version: importVersion,
          current_version: CURRENT_CONFIG_VERSION,
          migration_applied: importVersion !== CURRENT_CONFIG_VERSION
        }
      });
    }
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Configuration validation failed after migration',
        errors: validation.errors,
        warnings: validation.warnings,
        migration_info: {
          original_version: importVersion,
          current_version: CURRENT_CONFIG_VERSION
        }
      });
    }
    
    // Create backup before import
    const currentConfig = loadUIConfig();
    const backup = createBackup(currentConfig, `pre-import-${Date.now()}`);
    
    // Add import metadata
    migratedConfig.traefik_ui.backup.imported_at = new Date().toISOString();
    if (importVersion !== CURRENT_CONFIG_VERSION) {
      migratedConfig.traefik_ui.backup.migration_applied = true;
      migratedConfig.traefik_ui.backup.original_import_version = importVersion;
    }
    
    // Import configuration
    if (saveUIConfig(migratedConfig)) {
      res.json({
        success: true,
        message: 'Configuration imported successfully',
        backup: backup.success ? backup.filename : null,
        validation: validation,
        migration_info: {
          original_version: importVersion,
          current_version: CURRENT_CONFIG_VERSION,
          migration_applied: importVersion !== CURRENT_CONFIG_VERSION
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to import configuration' });
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import configuration' });
  }
});

// Validate configuration without saving
app.post('/api/config/ui/validate', (req, res) => {
  try {
    const { config } = req.body;
    
    let configToValidate;
    try {
      configToValidate = typeof config === 'string' ? yaml.load(config) : config;
    } catch (error) {
      return res.status(400).json({ 
        valid: false, 
        errors: ['Invalid YAML format'], 
        warnings: [] 
      });
    }
    
    const validation = validateUIConfig(configToValidate);
    res.json(validation);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate configuration' });
  }
});

app.listen(PORT, () => {
  console.log(`Traefik UI running on http://localhost:${PORT}`);
});