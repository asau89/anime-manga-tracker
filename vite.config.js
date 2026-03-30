import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api/mangaupdates': {
        target: 'https://api.mangaupdates.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangaupdates/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Strip browser headers so MU doesn't block it as a CORS attempt
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('User-Agent', 'node-fetch/1.0');
          });
        }
      }
    }
  }
})
