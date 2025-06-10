const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');

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

app.listen(PORT, () => {
  console.log(`Traefik UI running on http://localhost:${PORT}`);
});