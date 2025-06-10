const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');

// Shared configuration paths
const TRAEFIK_CONFIG_PATH = process.env.TRAEFIK_CONFIG || '/etc/traefik/traefik.yml';
const DYNAMIC_CONFIG_PATH = process.env.DYNAMIC_CONFIG || '/etc/traefik/dynamic.yml';

// Shared Docker client instance
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Shared utility functions
const loadConfig = () => {
  try {
    const staticConfig = fs.existsSync(TRAEFIK_CONFIG_PATH) 
      ? yaml.load(fs.readFileSync(TRAEFIK_CONFIG_PATH, 'utf8')) 
      : {};
    const dynamicConfig = fs.existsSync(DYNAMIC_CONFIG_PATH)
      ? yaml.load(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8'))
      : { http: { routers: {}, services: {} }, tls: { certificates: [] } };
    
    return { static: staticConfig, dynamic: dynamicConfig };
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
};

const saveDynamicConfig = (config) => {
  try {
    fs.writeFileSync(DYNAMIC_CONFIG_PATH, yaml.dump(config));
    return true;
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
};

const saveStaticConfig = (config) => {
  try {
    fs.writeFileSync(TRAEFIK_CONFIG_PATH, yaml.dump(config));
    return true;
  } catch (error) {
    throw new Error(`Failed to save static configuration: ${error.message}`);
  }
};

const restartTraefik = () => {
  return new Promise((resolve, reject) => {
    const command = process.env.RESTART_COMMAND || 'docker restart traefik';
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Restart failed: ${error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

module.exports = {
  docker,
  paths: {
    traefik: TRAEFIK_CONFIG_PATH,
    dynamic: DYNAMIC_CONFIG_PATH
  },
  loadConfig,
  saveDynamicConfig,
  saveStaticConfig,
  restartTraefik
};