/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { AuthUser, GuessResult, Room, RoomSettings } from '../types'
import type { RoomsById } from '../services/roomService'
import {
  createRoom as svcCreateRoom,
  joinRoom as svcJoinRoom,
  leaveRoom as svcLeaveRoom,
  startGuessSession as svcStartGuessSession,
  submitGuess as svcSubmitGuess,
  advanceGuessQuestion as svcAdvanceGuessQuestion,
  startGuessCountdown as svcStartGuessCountdown,
  startGuessResultPhase as svcStartGuessResultPhase,
  startTeamsGame as svcStartTeamsGame,
  startTeamsRound as svcStartTeamsRound,
  processTeamsCardAction as svcProcessTeamsCardAction,
  applyRoundWordConfirmation as svcApplyRoundWordConfirmation,
  finishTeamsGame as svcFinishTeamsGame,
} from '../services/roomService'
import type { TeamsCardAction } from '../services/roomService'
import {
  apiCreateRoom,
  apiJoinRoom,
  apiUpdateRoom,
  apiGetRoom,
  isApiEnabled,
} from '../api/rooms'
import { useAuth } from './AuthContext'

interface RoomContextValue {
  roomsById: RoomsById
  currentRoomId: string | null
  currentRoom: Room | null
  createRoom: (settings: RoomSettings) => Room | null
  joinRoomById: (roomId: string) => Room | null
  leaveCurrentRoom: () => void
  startGuessSession: () => Room | null
  submitGuess: (answer: string, usedHint?: boolean) => GuessResult | null
  advanceGuessQuestion: () => void
  startGuessCountdown: () => void
  startGuessResultPhase: () => void
  startTeamsGame: () => Room | null
  startTeamsRound: () => Room | null
  processTeamsCardAction: (action: TeamsCardAction, endRound?: boolean) => void
  applyRoundWordConfirmation: (countByCardId: Record<string, boolean>) => void
  finishTeamsGame: () => void
  resetRoomState: () => void
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined)

const ROOMS_STORAGE_KEY = 'medAlias:rooms'

function loadRoomsFromStorage(): RoomsById {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as RoomsById
  } catch {
    // ignore
  }
  return {}
}

const getRoomIdFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  const roomId =
    params.get('room') || params.get('ROOM') || params.get('Room') || null
  return roomId ? roomId.trim().toUpperCase() : null
}

const setRoomIdInUrl = (roomId: string | null) => {
  const url = new URL(window.location.href)
  if (roomId) {
    url.searchParams.set('room', roomId)
  } else {
    url.searchParams.delete('room')
  }
  window.history.replaceState(null, '', url.toString())
}

interface RoomProviderProps {
  children: ReactNode
}

const getInitialRooms = (): RoomsById => (isApiEnabled() ? {} : loadRoomsFromStorage())

export const RoomProvider = ({ children }: RoomProviderProps) => {
  const { user } = useAuth()
  const [roomsById, setRoomsById] = useState<RoomsById>(getInitialRooms)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)

  useEffect(() => {
    if (isApiEnabled()) return
    try {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(roomsById))
    } catch {
      // ignore
    }
  }, [roomsById])

  useEffect(() => {
    if (isApiEnabled()) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ROOMS_STORAGE_KEY || e.newValue == null) return
      try {
        const next = JSON.parse(e.newValue) as RoomsById
        setRoomsById((prev) => ({ ...prev, ...next }))
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const createdRoomRef = useRef<Room | null>(null)
  const joinedRoomRef = useRef<Room | null>(null)
  const lastMutationRef = useRef<number>(0)
  const markMutation = () => { lastMutationRef.current = Date.now() }

  const currentRoom = useMemo<Room | null>(
    () => (currentRoomId ? roomsById[currentRoomId] ?? null : null),
    [currentRoomId, roomsById],
  )

  const createRoom = useCallback(
    (settings: RoomSettings): Room | null => {
      if (!user) return null
      if (isApiEnabled()) {
        apiCreateRoom(user as AuthUser, settings)
          .then((room) => {
            setRoomsById((prev) => ({ ...prev, [room.id]: room }))
            setCurrentRoomId(room.id)
            setRoomIdInUrl(room.id)
          })
          .catch(console.error)
        return null
      }
      createdRoomRef.current = null
      setRoomsById((prev) => {
        const { roomsById: nextRooms, room } = svcCreateRoom(prev, user as AuthUser, settings)
        createdRoomRef.current = room
        return nextRooms
      })
      const room = createdRoomRef.current as Room | null
      const id = room?.id
      if (id) {
        setCurrentRoomId(id)
        setRoomIdInUrl(id)
      }
      return createdRoomRef.current as Room | null
    },
    [user],
  )

  const joinRoomById = useCallback(
    (roomId: string): Room | null => {
      if (!user) return null
      const normalizedId = roomId.trim().toUpperCase()
      if (isApiEnabled()) {
        apiJoinRoom(normalizedId, user as AuthUser)
          .then((room) => {
            if (room.status === 'finished') {
              // игра в этой комнате уже завершена — не даём в неё вернуться
              setRoomIdInUrl(null)
              return
            }
            setRoomsById((prev) => ({ ...prev, [room.id]: room }))
            setCurrentRoomId(room.id)
            setRoomIdInUrl(room.id)
          })
          .catch((e) => console.error('[joinRoomById]', e))
        return null
      }
      joinedRoomRef.current = null
      setRoomsById((prev) => {
        const { roomsById: nextRooms, room } = svcJoinRoom(prev, normalizedId, user as AuthUser)
        if (room) joinedRoomRef.current = room
        return nextRooms
      })
      const room = joinedRoomRef.current as Room | null
      if (room) {
        if (room.status === 'finished') {
          setRoomIdInUrl(null)
          return null
        }
        setCurrentRoomId(room.id)
        setRoomIdInUrl(room.id)
        return room
      }
      try {
        const stored = loadRoomsFromStorage()
        const storedRoom = stored[normalizedId]
        if (storedRoom) {
          const alreadyInRoom = storedRoom.players.some((p) => p.id === user.id)
          const roomToUse = alreadyInRoom
            ? storedRoom
            : {
                ...storedRoom,
                players: [
                  ...storedRoom.players,
                  { id: user.id, name: user.name, score: 0 },
                ],
              }
          setRoomsById((prev) => ({ ...prev, ...stored, [normalizedId]: roomToUse }))
          setCurrentRoomId(normalizedId)
          setRoomIdInUrl(normalizedId)
          return roomToUse
        }
      } catch {
        // ignore
      }
      return null
    },
    [user],
  )

  const leaveCurrentRoom = useCallback(() => {
    if (!currentRoomId || !user) return
    setRoomsById((prev) => {
      const { roomsById: nextRooms } = svcLeaveRoom(prev, currentRoomId, user.id)
      const room = nextRooms[currentRoomId]
      if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
      return nextRooms
    })
    setCurrentRoomId(null)
    setRoomIdInUrl(null)
  }, [currentRoomId, user])

  const startGuessSession = useCallback((): Room | null => {
    if (!currentRoomId) return null
    markMutation()
    let updatedRoom: Room | null = null
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcStartGuessSession(prev, currentRoomId)
      if (room) {
        updatedRoom = room
        if (isApiEnabled()) apiUpdateRoom(room).catch(console.error)
      }
      return nextRooms
    })
    return updatedRoom
  }, [currentRoomId])

  const submitGuess = useCallback(
    (answer: string, usedHint?: boolean): GuessResult | null => {
      if (!currentRoomId || !user) return null
      markMutation()
      let result: GuessResult | null = null
      setRoomsById((prev) => {
        const { roomsById: nextRooms, result: guessResult } = svcSubmitGuess(
          prev,
          currentRoomId,
          user.id,
          answer,
          usedHint,
        )
        result = guessResult
        const room = nextRooms[currentRoomId]
        if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
        return nextRooms
      })
      return result
    },
    [currentRoomId, user],
  )

  const advanceGuessQuestion = useCallback(() => {
    if (!currentRoomId) return
    markMutation()
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcAdvanceGuessQuestion(prev, currentRoomId)
      if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
      const fallback = nextRooms[currentRoomId]
      if (isApiEnabled() && !room && fallback) apiUpdateRoom(fallback).catch(console.error)
      return nextRooms
    })
  }, [currentRoomId])

  const startGuessCountdown = useCallback(() => {
    if (!currentRoomId) return
    markMutation()
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcStartGuessCountdown(prev, currentRoomId)
      if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
      return nextRooms
    })
  }, [currentRoomId])

  const startGuessResultPhase = useCallback(() => {
    if (!currentRoomId) return
    markMutation()
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcStartGuessResultPhase(prev, currentRoomId)
      if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
      return nextRooms
    })
  }, [currentRoomId])

  const startTeamsGame = useCallback((): Room | null => {
    if (!currentRoomId) return null
    markMutation()
    let updatedRoom: Room | null = null
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcStartTeamsGame(prev, currentRoomId)
      if (room) {
        updatedRoom = room
        if (isApiEnabled()) apiUpdateRoom(room).catch(console.error)
      }
      return nextRooms
    })
    return updatedRoom
  }, [currentRoomId])

  const startTeamsRound = useCallback((): Room | null => {
    if (!currentRoomId) return null
    markMutation()
    let updatedRoom: Room | null = null
    setRoomsById((prev) => {
      const { roomsById: nextRooms, room } = svcStartTeamsRound(prev, currentRoomId)
      if (room) {
        updatedRoom = room
        if (isApiEnabled()) apiUpdateRoom(room).catch(console.error)
      }
      return nextRooms
    })
    return updatedRoom
  }, [currentRoomId])

  const processTeamsCardAction = useCallback(
    (action: TeamsCardAction, endRound?: boolean) => {
      if (!currentRoomId) return
      markMutation()
      setRoomsById((prev) => {
        const { roomsById: nextRooms } = svcProcessTeamsCardAction(
          prev,
          currentRoomId,
          action,
          endRound,
        )
        const room = nextRooms[currentRoomId]
        if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
        return nextRooms
      })
    },
    [currentRoomId],
  )

  const applyRoundWordConfirmation = useCallback(
    (countByCardId: Record<string, boolean>) => {
      if (!currentRoomId) return
      markMutation()
      setRoomsById((prev) => {
        const { roomsById: nextRooms } = svcApplyRoundWordConfirmation(
          prev,
          currentRoomId,
          countByCardId,
        )
        const room = nextRooms[currentRoomId]
        if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
        return nextRooms
      })
    },
    [currentRoomId],
  )

  const finishTeamsGame = useCallback(() => {
    if (!currentRoomId) return
    markMutation()
    setRoomsById((prev) => {
      const { roomsById: nextRooms } = svcFinishTeamsGame(prev, currentRoomId)
      const room = nextRooms[currentRoomId]
      if (isApiEnabled() && room) apiUpdateRoom(room).catch(console.error)
      return nextRooms
    })
  }, [currentRoomId])

  const resetRoomState = useCallback(() => {
    setRoomsById({})
    setCurrentRoomId(null)
    setRoomIdInUrl(null)
  }, [])

  // Пуллинг состояния комнаты с сервера, чтобы лобби и игра обновлялись у всех клиентов
  useEffect(() => {
    if (!isApiEnabled() || !currentRoomId) return
    const id = currentRoomId
    const isFastPhase =
      currentRoom?.status === 'inGame' && currentRoom.settings.mode === 'guess'
    const intervalMs = isFastPhase ? 800 : 2500
    const interval = setInterval(() => {
      if (Date.now() - lastMutationRef.current < 4000) return
      apiGetRoom(id)
        .then((room) => {
          if (Date.now() - lastMutationRef.current < 4000) return
          setRoomsById((prev) => ({ ...prev, [room.id]: room }))
        })
        .catch((e) => {
          if ((e as Error).message?.toLowerCase().includes('room not found')) {
            setCurrentRoomId(null)
            setRoomIdInUrl(null)
          } else {
            console.warn('[RoomContext] polling error', e)
          }
        })
    }, intervalMs)
    return () => clearInterval(interval)
  }, [currentRoomId, currentRoom?.status, currentRoom?.settings.mode])

  // попытка авто-присоединения по параметру room в URL (отложенно, чтобы не вызывать setState из lifecycle)
  useEffect(() => {
    if (!user) return
    const roomIdFromUrl = getRoomIdFromUrl()
    if (roomIdFromUrl && !currentRoomId) {
      console.log('[RoomContext] useEffect: joining by URL room=', roomIdFromUrl)
      const id = roomIdFromUrl
      queueMicrotask(() => joinRoomById(id))
    }
  }, [user, currentRoomId, joinRoomById])

  const value: RoomContextValue = {
    roomsById,
    currentRoomId,
    currentRoom,
    createRoom,
    joinRoomById,
    leaveCurrentRoom,
    startGuessSession,
    submitGuess,
    advanceGuessQuestion,
    startGuessCountdown,
    startGuessResultPhase,
    startTeamsGame,
    startTeamsRound,
    processTeamsCardAction,
    applyRoundWordConfirmation,
    finishTeamsGame,
    resetRoomState,
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export const useRoom = (): RoomContextValue => {
  const ctx = useContext(RoomContext)
  if (!ctx) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return ctx
}

