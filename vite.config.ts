import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const base = env.VITE_BASE_PATH || '/';

    return {
        base,
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: null, // registro manual em src/main.tsx (controle explícito de quando ativar)
                includeAssets: ['favicon.svg'],
                manifest: {
                    id: base,
                    name: 'Orion — Restaurante',
                    short_name: 'Orion',
                    description: 'Orion — sistema de restaurante (cardápio, pedidos, mesas, estoque)',
                    start_url: base,
                    scope: base,
                    display: 'standalone',
                    background_color: '#12100E',
                    theme_color: '#12100E',
                    icons: [
                        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                        { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    ],
                },
                workbox: {
                    navigateFallback: `${base}index.html`,
                    // API/gateway nunca deve ser servida do cache do app-shell.
                    navigateFallbackDenylist: [/^\/api\//],
                    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
                },
                devOptions: {
                    enabled: false,
                },
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@core': path.resolve(__dirname, './src/@core'),
            },
        },
        server: {
            port: Number(env.VITE_APP_PORT) || 3001,
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            sourcemap: mode !== 'production',
        },
    };
});
