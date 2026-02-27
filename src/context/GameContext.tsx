/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import type { GameMode, GuessResult } from '../types'
import { useRoom } from './RoomContext'

interface GameContextValue {
  mode: GameMode | null
  hasAnswered: boolean
  lastResult: GuessResult | null
  selectMode: (mode: GameMode) => void
  startGuessGame: () => void
  submitGuess: (answer: string, usedHint?: boolean) => void
  resetGame: () => void
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

interface GameProviderProps {
  children: ReactNode
}

export const GameProvider = ({ children }: GameProviderProps) => {
  const { currentRoom, startGuessSession, submitGuess: roomSubmitGuess } = useRoom()
  const [mode, setMode] = useState<GameMode | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [lastResult, setLastResult] = useState<GuessResult | null>(null)
  const prevQuestionIndexRef = useRef<number>(-1)

  // Reset hasAnswered when server advances to the next question
  useEffect(() => {
    const idx = currentRoom?.currentQuestionIndex ?? -1
    if (prevQuestionIndexRef.current !== -1 && idx !== prevQuestionIndexRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasAnswered(false)
      setLastResult(null)
    }
    prevQuestionIndexRef.current = idx
  }, [currentRoom?.currentQuestionIndex])

  const selectMode = useCallback((nextMode: GameMode) => {
    setMode(nextMode)
    setHasAnswered(false)
    setLastResult(null)
  }, [])

  const startGuessGame = useCallback(() => {
    if (!currentRoom || currentRoom.settings.mode !== 'guess') return
    startGuessSession()
    setHasAnswered(false)
    setLastResult(null)
  }, [currentRoom, startGuessSession])

  const submitGuess = useCallback(
    (answer: string, usedHint?: boolean) => {
      if (!currentRoom || hasAnswered) return
      if (currentRoom.settings.mode !== 'guess') return
      if (currentRoom.status !== 'inGame') return

      const result = roomSubmitGuess(answer, usedHint)
      if (!result) return

      setLastResult(result)
      setHasAnswered(true)
    },
    [currentRoom, hasAnswered, roomSubmitGuess],
  )

  const resetGame = useCallback(() => {
    setMode(null)
    setHasAnswered(false)
    setLastResult(null)
  }, [])

  const value: GameContextValue = {
    mode,
    hasAnswered,
    lastResult,
    selectMode,
    startGuessGame,
    submitGuess,
    resetGame,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return ctx
}
