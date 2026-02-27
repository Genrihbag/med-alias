import { useCallback, useEffect, useMemo, useState } from 'react'

import { CATEGORIES } from '../constants/categories'
import { useAuth } from '../context/AuthContext'
import { useRoom } from '../context/RoomContext'
import { useGame } from '../context/GameContext'
import type { GameMode } from '../types'

const GUESS_COUNTDOWN_SEC = 5

interface LobbyProps {
  onBackToHome: () => void
  onStartGuess: () => void
  pendingTeamsCountdown?: boolean
  onTeamsCountdownDone?: () => void
}

const modeLabel = (mode: GameMode): string => {
  switch (mode) {
    case 'teams':
      return 'Командный режим'
    case 'guess':
      return 'Онлайн режим'
    default:
      return mode
  }
}

export const Lobby = ({
  onBackToHome,
  onStartGuess,
  pendingTeamsCountdown = false,
  onTeamsCountdownDone,
}: LobbyProps) => {
  const { user } = useAuth()
  const { currentRoom, leaveCurrentRoom, startTeamsGame, startGuessCountdown } = useRoom()
  const { startGuessGame } = useGame()
  const [countdown, setCountdown] = useState<number | null>(null)
  const [guessCountdown, setGuessCountdown] = useState<number | null>(null)
  const [copyToast, setCopyToast] = useState(false)

  const isHost = useMemo(
    () => !!currentRoom && !!user && currentRoom.hostId === user.id,
    [currentRoom, user],
  )

  useEffect(() => {
    if (!pendingTeamsCountdown || currentRoom?.settings.mode !== 'teams' || !isHost) return
    setCountdown(5)
  }, [pendingTeamsCountdown, currentRoom?.settings.mode, isHost])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const t = setTimeout(() => {
      if (countdown === 1) {
        startTeamsGame()
        onTeamsCountdownDone?.()
        setCountdown(null)
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [countdown, startTeamsGame, onTeamsCountdownDone])

  // Guess countdown: derived from server timestamp so ALL clients see it
  useEffect(() => {
    const startedAt = currentRoom?.guessCountdownStartedAt
    if (!startedAt || currentRoom?.status !== 'lobby') {
      setGuessCountdown(null)
      return
    }

    const recompute = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const left = Math.max(0, GUESS_COUNTDOWN_SEC - elapsed)
      setGuessCountdown(left)
    }

    recompute()
    const t = setInterval(recompute, 500)
    return () => clearInterval(t)
  }, [currentRoom?.guessCountdownStartedAt, currentRoom?.status])

  const handleGuessCountdownDone = useCallback(() => {
    startGuessGame()
    onStartGuess()
  }, [startGuessGame, onStartGuess])

  // When guess countdown reaches 0, host starts the game
  useEffect(() => {
    if (guessCountdown === 0 && isHost && currentRoom?.status === 'lobby') {
      handleGuessCountdownDone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessCountdown, isHost, currentRoom?.status])

  if (!currentRoom) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Комната не найдена или ещё не создана.
        </div>
      </div>
    )
  }

  const roomUrl = `${window.location.origin}/?room=${currentRoom.id}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 2500)
    } catch {
      // ignore clipboard errors
    }
  }

  const handleLeave = () => {
    leaveCurrentRoom()
    onBackToHome()
  }

  const handleStartGuess = () => {
    if (currentRoom.settings.mode !== 'guess') return
    startGuessCountdown()
  }

  const handleStartTeamsGame = () => {
    if (currentRoom.settings.mode !== 'teams') return
    startTeamsGame()
  }

  const isGuess = currentRoom.settings.mode === 'guess'
  const showCountdown =
    (currentRoom.settings.mode === 'teams' && countdown !== null && countdown > 0) ||
    (currentRoom.settings.mode === 'guess' && guessCountdown !== null && guessCountdown > 0)

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center bg-slate-950 px-4 text-slate-100">
      {copyToast && (
        <div className="fixed left-0 right-0 top-0 z-50 flex justify-center pt-4">
          <p className="rounded-xl border border-emerald-600/80 bg-emerald-950/90 px-4 py-2 text-sm font-medium text-emerald-200 shadow-lg">
            Ссылка скопирована
          </p>
        </div>
      )}
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95">
          <p className="text-slate-400">Игра начнётся через</p>
          <p className="text-8xl font-bold tabular-nums text-sky-400">
            {currentRoom.settings.mode === 'teams' ? countdown : guessCountdown}
          </p>
        </div>
      )}
      <div className="w-full max-w-4xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <div>
          <p className="mb-1 text-sm text-violet-400">Лобби</p>
          <h1 className="text-2xl font-semibold">{modeLabel(currentRoom.settings.mode)}</h1>
          <p className="mt-1 text-xs text-slate-300">
            {isGuess
              ? 'Делитесь кодом комнаты или ссылкой, чтобы другие игроки могли присоединиться.'
              : 'Участники добавляются локально перед началом игры.'}
          </p>
        </div>
        {isGuess && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-mono text-4xl font-bold tracking-wider text-violet-400">{currentRoom.id}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">Код комнаты</p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="font-mono text-sm font-bold text-violet-300 underline decoration-dotted hover:text-violet-200"
            >
              {roomUrl}
            </button>
            <p className="text-[11px] text-slate-500">Нажмите, чтобы скопировать ссылку</p>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Игроки</h2>
            <div className="mt-2 max-h-64 overflow-y-auto pr-1">
              <ul className="space-y-1 text-sm">
                {currentRoom.players.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2"
                  >
                    <span className="flex justify-between items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-400" />
                      <span>{player.name}</span>
                      {player.id === currentRoom.hostId && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                          Оганизатор
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
            <h2 className="text-sm font-semibold text-slate-100">Параметры комнаты</h2>
            <dl className="mt-2 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Режим</dt>
                <dd className="font-medium text-slate-100">
                  {modeLabel(currentRoom.settings.mode)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Категории</dt>
                <dd className="text-right">
                  {currentRoom.settings.categories.length > 0
                    ? currentRoom.settings.categories
                        .map((id) => CATEGORIES[id as keyof typeof CATEGORIES]?.label ?? id)
                        .join(', ')
                    : 'Все'}
                </dd>
              </div>
              {currentRoom.settings.mode !== 'guess' && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Длительность раунда</dt>
                    <dd>{currentRoom.settings.roundDurationSec} секунд</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Максимум игроков</dt>
                    <dd>{currentRoom.settings.maxPlayers}</dd>
                  </div>
                </>
              )}
              {currentRoom.settings.mode === 'guess' && currentRoom.settings.totalQuestions && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Вопросов в сессии</dt>
                  <dd>{currentRoom.settings.totalQuestions}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Покинуть комнату
          </button>

          {currentRoom.settings.mode === 'guess' && isHost && (
            <button
              type="button"
              onClick={handleStartGuess}
              className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/30 transition hover:bg-violet-300"
            >
              Начать игру
            </button>
          )}
          {currentRoom.settings.mode === 'teams' && isHost && (
            <button
              type="button"
              onClick={handleStartTeamsGame}
              className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300"
            >
              Начать игру
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Lobby

