import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { quizSyncPlugin } from './vite-plugin-quiz-sync'

export default defineConfig({
  plugins: [react(), quizSyncPlugin()],
  server: {
    port: 5173,
    host: true,
  },
})
