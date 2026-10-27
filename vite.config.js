import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // These two packages are imported lazily (Supabase when the auth client is
  // needed, pdf.js when a PDF is opened or scanned). Without this, Vite can
  // discover them at runtime, re-optimize dependencies and force a full page
  // reload in the middle of an upload.
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'pdfjs-dist'],
  },
  server: {
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/layouts/member/MemberLayout.jsx',
        './src/pages/PrivatePages/Dashboard/Dashboard.jsx',
        './src/services/auth/authService.js',
        './src/services/documents/documentService.js',
        './src/services/documents/pdfDetection.js',
        './src/components/documents/PdfFieldEditor.jsx',
      ],
    },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'router-vendor',
              test: /[\\/]node_modules[\\/]react-router(?:-dom)?[\\/]/,
              priority: 15,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?@supabase[\\/]/,
              priority: 10,
              includeDependenciesRecursively: true,
            },
          ],
        },
      },
    },
  },
})
