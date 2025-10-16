import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow connections from outside the container
    proxy: {
      '/api': 'http://backend:8000',
      '/version': 'http://backend:8000',
      '/health': 'http://backend:8000',
    },
  },
});
