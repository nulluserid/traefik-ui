const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// DNS Provider management
const DNS_PROVIDERS_PATH = path.join(__dirname, '..', 'dns-providers.json');

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
router.get('/api/dns-providers', (req, res) => {
  try {
    const providers = loadDNSProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new DNS provider
router.post('/api/dns-providers', (req, res) => {
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
router.delete('/api/dns-providers/:name', (req, res) => {
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
router.post('/api/dns-providers/:name/test', (req, res) => {
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

module.exports = router;