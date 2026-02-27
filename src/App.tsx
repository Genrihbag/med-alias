import { useEffect, useState } from 'react'

import type { AppView, GameMode } from './types'
import { useGame } from './context/GameContext'
import { useRoom } from './context/RoomContext'
import WelcomeScreen from './components/WelcomeScreen'
import TeamsSetup from './components/TeamsSetup'
import GuessSetup from './components/GuessSetup'
import Lobby from './components/Lobby'
import GuessBoard from './components/GuessBoard'
import TeamsCardView from './components/TeamsCardView'
import TeamsWordConfirmation from './components/TeamsWordConfirmation'
import TeamsRoundResults from './components/TeamsRoundResults'
import ResultsScreen from './components/ResultsScreen'

/** Извлекает код комнаты из введённой строки: ссылка с ?room=MED123 или просто MED123 */
function extractRoomIdFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const looksLikeUrl =
      /^https?:\/\//i.test(trimmed) ||
      /[?&]room=/i.test(trimmed)
    if (looksLikeUrl) {
      const url = /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed)
        : new URL('http://host?' + trimmed.replace(/^[?&]/, ''))
      for (const key of ['room', 'ROOM', 'Room']) {
        const room = url.searchParams.get(key)
        if (room) return room.trim().toUpperCase()
      }
      const match = trimmed.match(/MED\d{3,}/i)
      if (match) return match[0].toUpperCase()
    }
  } catch {
    // не URL
  }
  return trimmed.toUpperCase()
}

const App = () => {
  const { mode, selectMode, resetGame } = useGame()
  const { currentRoom, joinRoomById, resetRoomState } = useRoom()
  const [view, setView] = useState<AppView>('welcome')
  const [pendingTeamsCountdown, setPendingTeamsCountdown] = useState(false)
  const [showCreatingRoom, setShowCreatingRoom] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomInUrl = params.get('room') || params.get('ROOM') || params.get('Room')
    if (roomInUrl && view === 'welcome') {
      setView('lobby')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (view !== 'lobby' || currentRoom) {
      setShowCreatingRoom(false)
      return
    }
    const t = setTimeout(() => setShowCreatingRoom(true), 500)
    return () => clearTimeout(t)
  }, [view, currentRoom])

  const handleSelectMode = (nextMode: GameMode) => {
    selectMode(nextMode)
    if (nextMode === 'teams') {
      setView('teamsSetup')
    } else if (nextMode === 'guess') {
      setView('guessSetup')
    }
  }

  const handleJoinRoomByCode = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    const roomId = extractRoomIdFromInput(input)
    console.log('[App] handleJoinRoomByCode', roomId ?? trimmed)
    if (roomId) joinRoomById(roomId)
    setView('lobby')
  }

  const handleGoHome = () => {
    resetGame()
    resetRoomState()
    setView('welcome')
  }

  const handleCreateRoom = (opts?: { countdown?: 'teams' | 'guess' }) => {
    setView('lobby')
    if (opts?.countdown === 'teams') setPendingTeamsCountdown(true)
  }

  const handleStartGuessView = () => {
    setView('guessGame')
  }

  if (currentRoom) {
    if (currentRoom.status === 'finished') {
      if (currentRoom.settings.mode === 'teams') {
        const winner = [...currentRoom.teams].sort((a, b) => b.score - a.score)[0]
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-center">
              <h2 className="text-xl font-semibold text-slate-100">Игра завершена</h2>
              <p className="mt-3 text-lg text-emerald-300">
                Победу одержала команда «{winner?.name ?? 'Команда'}»
              </p>
              <button
                type="button"
                onClick={handleGoHome}
                className="mt-6 min-w-[12rem] rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950"
              >
                Главное меню
              </button>
            </div>
          </div>
        )
      }
      return <ResultsScreen onBackToHome={handleGoHome} />
    }

    if (currentRoom.settings.mode === 'guess' && currentRoom.status === 'inGame') {
      return <GuessBoard />
    }

    if (currentRoom.settings.mode === 'teams' && currentRoom.status === 'inGame' && currentRoom.teamsGameState) {
      if (currentRoom.teamsGameState.phase === 'wordConfirmation') {
        return <TeamsWordConfirmation />
      }
      if (currentRoom.teamsGameState.phase === 'roundResults') {
        return <TeamsRoundResults onBackToHome={handleGoHome} />
      }
      return <TeamsCardView />
    }

    return (
      <Lobby
        onBackToHome={handleGoHome}
        onStartGuess={handleStartGuessView}
        pendingTeamsCountdown={pendingTeamsCountdown}
        onTeamsCountdownDone={() => setPendingTeamsCountdown(false)}
      />
    )
  }

  if (view === 'lobby' && !currentRoom) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        {showCreatingRoom && <p className="text-slate-400">Загрузка комнаты…</p>}
      </div>
    )
  }

  if (view === 'teamsSetup' && mode === 'teams') {
    return <TeamsSetup onBack={handleGoHome} onCreated={handleCreateRoom} />
  }

  if (view === 'guessSetup' && mode === 'guess') {
    return <GuessSetup onBack={handleGoHome} onCreated={handleCreateRoom} />
  }

  // главный экран: приветствие и выбор режимов
  return (
    <WelcomeScreen onSelectMode={handleSelectMode} onJoinRoomByCode={handleJoinRoomByCode} />
  )
}

export default App
