import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRooms, saveRooms } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

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
