import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// RNF08 - módulo de salão (mobile) e admin/KDS (telas largas) rodam do
// mesmo build; a responsividade é resolvida em CSS (Tailwind), não em
// builds separados.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
});
