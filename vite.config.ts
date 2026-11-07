import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  // `vite build --mode artifact` : une seule page HTML autonome (polices comprises), sans mode hors ligne.
  ...(mode === 'artifact' ? { build: { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000 } } : {}),
  plugins: [
    react(),
    mode === 'artifact' ? viteSingleFile() : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'La retenue',
        short_name: 'Retenue',
        description: "Comprendre la retenue dans l'addition, avec des animations.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F7FC',
        theme_color: '#2B74D9',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: { host: true },
}));
