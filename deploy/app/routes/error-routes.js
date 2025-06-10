const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Error logging endpoint
router.post('/api/errors/log', (req, res) => {
  try {
    const { errors } = req.body;
    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({ error: 'Invalid error data' });
    }

    // Create error log directory outside container
    const errorLogDir = '/logs/ui-errors';
    const errorLogFile = path.join(errorLogDir, 'client-errors.jsonl');
    
    // Ensure directory exists
    fs.mkdirSync(errorLogDir, { recursive: true });

    // Append errors to log file (one JSON object per line)
    const logEntries = errors.map(error => JSON.stringify({
      ...error,
      serverTimestamp: new Date().toISOString(),
      serverIP: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    })).join('\n') + '\n';

    fs.appendFileSync(errorLogFile, logEntries);

    // Also log to console for immediate visibility
    console.log(`🚨 ${errors.length} client error(s) logged to ${errorLogFile}`);
    errors.forEach(error => {
      console.error(`  ${error.type}: ${error.message} (${error.component || 'unknown'}) at ${error.url}`);
    });

    res.json({ success: true, logged: errors.length });
  } catch (error) {
    console.error('Failed to log client errors:', error);
    res.status(500).json({ error: 'Failed to log errors' });
  }
});

// Error log viewer endpoint
router.get('/api/errors/recent', (req, res) => {
  try {
    const errorLogFile = '/logs/ui-errors/client-errors.jsonl';
    const limit = parseInt(req.query.limit) || 50;
    
    if (!fs.existsSync(errorLogFile)) {
      return res.json({ errors: [], total: 0 });
    }

    const logData = fs.readFileSync(errorLogFile, 'utf8');
    const lines = logData.trim().split('\n').filter(line => line.trim());
    const errors = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Return most recent errors
    const recentErrors = errors.slice(-limit).reverse();
    
    res.json({ 
      errors: recentErrors, 
      total: errors.length,
      filename: errorLogFile 
    });
  } catch (error) {
    console.error('Failed to read error log:', error);
    res.status(500).json({ error: 'Failed to read error log' });
  }
});

module.exports = router;