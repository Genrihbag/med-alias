/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { GameMode, GuessResult } from '../types'
import { useRoom } from './RoomContext'

interface GameContextValue {
  mode: GameMode | null
  hasAnswered: boolean
  lastResult: GuessResult | null
  questionNumber: number
  selectMode: (mode: GameMode) => void
  startGuessGame: () => void
  submitGuess: (answer: string, usedHint?: boolean) => void
  nextQuestion: () => void
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
  const [questionNumber, setQuestionNumber] = useState(1)

  const isGuessMode = useMemo(() => mode === 'guess', [mode])

  const selectMode = useCallback((nextMode: GameMode) => {
    setMode(nextMode)
    setHasAnswered(false)
    setLastResult(null)
    setQuestionNumber(1)
  }, [])

  const startGuessGame = useCallback(() => {
    if (!isGuessMode) return
    startGuessSession()
    setHasAnswered(false)
    setLastResult(null)
    setQuestionNumber(1)
  }, [isGuessMode, startGuessSession])

  const submitGuess = useCallback(
    (answer: string, usedHint?: boolean) => {
      if (!isGuessMode || !currentRoom || hasAnswered) return

      const result = roomSubmitGuess(answer, usedHint)
      if (!result) return

      setLastResult(result)
      setHasAnswered(true)
    },
    [currentRoom, hasAnswered, isGuessMode, roomSubmitGuess],
  )

  const nextQuestion = useCallback(() => {
    if (!isGuessMode) return
    if (!currentRoom) return
    if (currentRoom.status === 'finished') return

    setHasAnswered(false)
    setLastResult(null)
    setQuestionNumber((prev) => prev + 1)
  }, [currentRoom, isGuessMode])

  const resetGame = useCallback(() => {
    setMode(null)
    setHasAnswered(false)
    setLastResult(null)
    setQuestionNumber(1)
  }, [])

  const value: GameContextValue = {
    mode,
    hasAnswered,
    lastResult,
    questionNumber,
    selectMode,
    startGuessGame,
    submitGuess,
    nextQuestion,
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

