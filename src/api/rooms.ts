const rawBase = import.meta.env.VITE_API_URL
// Если VITE_API_URL не задан, используем относительные пути (`/api/...`) на тот же домен.
const BASE = typeof rawBase === 'string' && rawBase.length > 0 ? rawBase : ''

export type Room = import('../types').Room
export type RoomSettings = import('../types').RoomSettings
export type AuthUser = import('../types').AuthUser

type RequestOpts = Omit<RequestInit, 'body'> & { body?: unknown }

async function request<T>(path: string, options?: RequestOpts): Promise<T> {
  const { body, ...rest } = options ?? {}
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export async function apiCreateRoom(
  host: AuthUser,
  settings: RoomSettings,
): Promise<Room> {
  return request<Room>('/api/rooms', {
    method: 'POST',
    body: { host, settings },
  })
}

export async function apiJoinRoom(
  roomId: string,
  user: AuthUser,
): Promise<Room> {
  const id = roomId.trim().toUpperCase()
  return request<Room>(`/api/rooms/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    body: user,
  })
}

export async function apiGetRoom(roomId: string): Promise<Room> {
  const id = roomId.trim().toUpperCase()
  return request<Room>(`/api/rooms/${encodeURIComponent(id)}`)
}

export async function apiUpdateRoom(room: Room): Promise<Room> {
  return request<Room>(`/api/rooms/${encodeURIComponent(room.id)}`, {
    method: 'PATCH',
    body: room,
  })
}

export function isApiEnabled(): boolean {
  // В продакшене всегда работаем через API (тот же хост), в dev — только если задан VITE_API_URL.
  return import.meta.env.PROD || Boolean(rawBase)
}
