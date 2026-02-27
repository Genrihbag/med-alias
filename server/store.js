import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function loadRooms() {
  ensureDataDir()
  if (!fs.existsSync(ROOMS_FILE)) return {}
  try {
    const raw = fs.readFileSync(ROOMS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveRooms(roomsById) {
  ensureDataDir()
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsById, null, 2), 'utf8')
}
