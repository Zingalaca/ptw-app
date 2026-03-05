import { exec } from 'child_process'
import express from 'express'

const router = express.Router()

router.post('/reseed', (_req, res) => {
  exec('npx prisma db seed', {
    cwd: process.cwd(),
    env: process.env,
    timeout: 60_000,
  }, (err, _stdout, stderr) => {
    if (err) {
      console.error('Reseed failed:\n', stderr)
      return res.status(500).json({ error: 'Reseed failed', details: stderr.slice(0, 500) })
    }
    res.json({ ok: true, message: 'Database reseeded successfully' })
  })
})

export default router
