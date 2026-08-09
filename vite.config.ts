import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

function localAnalysisAccessPlugin(): Plugin {
  return {
    name: 'oracular-local-analysis-access',
    configureServer(server) {
      server.middlewares.use('/api/analysis-access', (request, response, next) => {
        if (request.method !== 'POST') {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          remaining: null,
          resetAt: null,
          unlimited: true,
        }));
      });
      server.middlewares.use('/api/developer-session', (_request, response) => {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ authenticated: true }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [localAnalysisAccessPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(sourceDirectory),
    },
  },
});
