import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import emailPlugin from './plugins/emailPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailPlugin()],
})
