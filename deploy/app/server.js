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

app.listen(PORT, () => {
  console.log(`Traefik UI running on http://localhost:${PORT}`);
});