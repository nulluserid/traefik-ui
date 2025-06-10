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

app.listen(PORT, () => {
  console.log(`Traefik UI running on http://localhost:${PORT}`);
});