const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Dev server only: the web app posts one scan trace per scan here (src/lib/scanTiming.ts).
// `net` is a short hash of the phone's public IP, so Wi-Fi and mobile-data runs can be told apart.
const TIMING_FILE = path.join(__dirname, '.scan-timing', 'scans.jsonl');

const enhanceDefault = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const next = enhanceDefault ? enhanceDefault(middleware, server) : middleware;
    return (req, res, fallthrough) => {
      if (req.method !== 'POST' || !req.url?.startsWith('/__scan-timing')) return next(req, res, fallthrough);
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 100_000) req.destroy();
      });
      req.on('end', () => {
        try {
          const ip = String(req.headers['cf-connecting-ip'] ?? req.socket.remoteAddress ?? '');
          const record = { net: crypto.createHash('sha256').update(ip).digest('hex').slice(0, 8), ...JSON.parse(body) };
          fs.mkdirSync(path.dirname(TIMING_FILE), { recursive: true });
          fs.appendFileSync(TIMING_FILE, JSON.stringify(record) + '\n');
          console.log('[scan-timing]', JSON.stringify(record));
          res.statusCode = 204;
        } catch {
          res.statusCode = 400;
        }
        res.end();
      });
    };
  },
};

module.exports = config;
