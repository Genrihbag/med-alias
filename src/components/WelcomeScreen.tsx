import { useState, type FormEvent } from 'react'

import { CATEGORIES } from '../constants/categories'
import type { GameMode } from '../types'
import { useAuth } from '../context/AuthContext'

interface WelcomeScreenProps {
  onSelectMode: (mode: GameMode) => void
  onJoinRoomByCode?: (roomId: string) => void
}

const MODE_LABELS: Record<GameMode, string> = {
  teams: 'Командный режим',
  guess: 'Угадайка',
}

export const WelcomeScreen = ({ onSelectMode, onJoinRoomByCode }: WelcomeScreenProps) => {
  const { user, isLoading, setUserName } = useAuth()
  const [nameInput, setNameInput] = useState('')
  const [roomCode, setRoomCode] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Загрузка...
        </div>
      </div>
    )
  }

  const handleNameSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setUserName(trimmed)
    setNameInput('')
  }

  const handleJoinRoom = () => {
    const trimmed = roomCode.trim().toUpperCase()
    if (!trimmed || !onJoinRoomByCode) return
    onJoinRoomByCode(trimmed)
    setRoomCode('')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-6 shadow-2xl">
          <h1 className="mb-4 text-center text-2xl font-semibold">
            Добро пожаловать в МедАлиас
          </h1>
          <p className="mb-4 text-sm text-slate-300">
            Введите своё имя, чтобы мы знали, как к вам обращаться в игре.
          </p>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-200">
              Имя
              <input
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Например, Анна"
              />
            </label>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              Продолжить
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-3xl space-y-8 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <div>
          <p className="mb-2 text-sm text-emerald-400">Приветствие</p>
          <h1 className="text-3xl font-semibold">
            Здравствуй, <span className="text-emerald-400">{user.name}</span>, во что сегодня
            поиграем?
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectMode('teams')}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-left text-sm transition hover:border-sky-400 hover:bg-slate-900/80"
          >
            <span className="text-lg font-semibold">{MODE_LABELS.teams}</span>
            <span className="text-xs text-slate-300">
              Игроки делятся на команды и соревнуются друг с другом.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('guess')}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-left text-sm transition hover:border-violet-400 hover:bg-slate-900/80"
          >
            <span className="text-lg font-semibold">{MODE_LABELS.guess}</span>
            <span className="text-xs text-slate-300">
              Онлайн-угадайка: у всех одни и те же загадки, очки считаются по игрокам.
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-100">Присоединиться по коду комнаты</p>
              <p className="text-xs text-slate-400">
                Оганизатор может поделиться ссылкой вида{' '}
                <span className="font-mono text-xs text-slate-200">/?room=MED123</span>.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value)}
              placeholder="Например, MED123"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!onJoinRoomByCode}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Войти
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
          <p className="mb-2 font-semibold text-slate-200">Категории в игре</p>
          <div className="grid gap-2 md:grid-cols-3">
            {Object.values(CATEGORIES).map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-2"
              >
                <span className="text-lg">{category.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[13px] text-slate-100">{category.label}</span>
                  <span className="text-[11px] text-slate-400">{category.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen

