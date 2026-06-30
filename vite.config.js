import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Ensure _headers, .htaccess, robots.txt, sitemap.xml all copy to dist
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom'],
          recharts: ['recharts'],
        },
        // Stable filenames help with cache invalidation on deploy
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
