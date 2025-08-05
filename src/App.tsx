import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Restaurants } from './pages/Restaurants';
import { OSCs } from './pages/OSCs';
      index: '/index.html',
    },
  },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
