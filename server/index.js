import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { loadRooms, saveRooms } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const hasTelegram = Boolean(TELEGRAM_BOT_TOKEN)

app.use(cors({ origin: true }))
app.use(express.json())

const ROOM_ID_PREFIX = 'MED'

function generateRoomId(roomsById) {
  let id
  do {
    const num = Math.floor(100 + Math.random() * 900)
    id = `${ROOM_ID_PREFIX}${num}`
  } while (roomsById[id])
  return id
}

function buildTeamsFromNames(teamNames = []) {
  return teamNames.map((name, i) => ({
    id: `team-${i}`,
    name,
    playerIds: [],
    score: 0,
  }))
}

function createInitialRoom(id, host, settings) {
  const teams =
    settings.mode === 'teams' && settings.teamNames?.length
      ? buildTeamsFromNames(settings.teamNames)
      : []
  return {
    id,
    hostId: host.id,
    settings,
    players: [{ id: host.id, name: host.name, score: 0 }],
    teams,
    status: 'lobby',
    currentQuestionIndex: 0,
    usedCardIds: [],
  }
}

function buildTelegramCheckString(search) {
  const entries = Array.from(search.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
  return entries.join('\n')
}

function verifyTelegramInitData(initData) {
  if (!hasTelegram || !initData) return { ok: false, user: null }
  const search = new URLSearchParams(initData)
  const hash = search.get('hash')
  if (!hash) return { ok: false, user: null }

  const dataCheckString = buildTelegramCheckString(search)
  const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest()
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (computedHash !== hash) return { ok: false, user: null }

  const userJson = search.get('user')
  let user = null
  if (userJson) {
    try {
      user = JSON.parse(userJson)
    } catch {
      user = null
    }
  }
  return { ok: true, user }
}

app.post('/api/rooms', (req, res) => {
  try {
    const { host, settings } = req.body
    if (!host?.id || !host?.name || !settings) {
      return res.status(400).json({ error: 'host and settings required' })
    }
    const roomsById = loadRooms()
    const id = generateRoomId(roomsById)
    const room = createInitialRoom(id, host, settings)
    roomsById[id] = room
    saveRooms(roomsById)
    res.json(room)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e.message) })
  }
})

app.post('/api/rooms/:id/join', (req, res) => {
  try {
    const id = req.params.id.trim().toUpperCase()
    const user = req.body
    if (!user?.id || !user?.name) {
      return res.status(400).json({ error: 'user.id and user.name required' })
    }
    const roomsById = loadRooms()
    const room = roomsById[id]
    if (!room) {
      return res.status(404).json({ error: 'room not found' })
    }
    const alreadyInRoom = room.players.some((p) => p.id === user.id)
    if (!alreadyInRoom) {
      room.players.push({ id: user.id, name: user.name, score: 0 })
      roomsById[id] = room
      saveRooms(roomsById)
    }
    res.json(room)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e.message) })
  }
})

app.get('/api/rooms/:id', (req, res) => {
  try {
    const id = req.params.id.trim().toUpperCase()
    const roomsById = loadRooms()
    const room = roomsById[id]
    if (!room) {
      return res.status(404).json({ error: 'room not found' })
    }
    res.json(room)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e.message) })
  }
})

app.patch('/api/rooms/:id', (req, res) => {
  try {
    const id = req.params.id.trim().toUpperCase()
    const room = req.body
    if (!room || room.id !== id) {
      return res.status(400).json({ error: 'invalid room' })
    }
    const roomsById = loadRooms()
    if (!roomsById[id]) {
      return res.status(404).json({ error: 'room not found' })
    }
    roomsById[id] = room
    saveRooms(roomsById)
    res.json(room)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e.message) })
  }
})

if (hasTelegram) {
  app.post('/api/telegram/validate', (req, res) => {
    try {
      const { initData } = req.body ?? {}
      if (typeof initData !== 'string' || !initData) {
        return res.status(400).json({ error: 'initData required' })
      }
      const { ok, user } = verifyTelegramInitData(initData)
      if (!ok) {
        return res.status(401).json({ error: 'invalid initData' })
      }
      return res.json({ ok: true, user })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: String(e.message) })
    }
  })
}

// Production: serve frontend from dist (build with VITE_API_URL='' for same-origin)
if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${isProd ? ' (production)' : ''}`)
})
