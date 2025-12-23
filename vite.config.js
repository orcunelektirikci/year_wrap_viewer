import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function configApiPlugin() {
  return {
    name: 'year-wrap-config-api',
    configureServer(server) {
      const projectRoot = server.config.root
      const configPath = path.join(projectRoot, 'config.json')

      server.middlewares.use('/api/config', async (req, res) => {
        try {
          if (req.method === 'GET') {
            const text = fs.readFileSync(configPath, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(text)
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                const pretty = JSON.stringify(parsed, null, 2) + '\n'
                fs.writeFileSync(configPath, pretty, 'utf-8')
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(pretty)
              } catch (e) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: 'Invalid JSON body' }))
              }
            })
            return
          }

          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Failed to read/write config.json' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), configApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
})
