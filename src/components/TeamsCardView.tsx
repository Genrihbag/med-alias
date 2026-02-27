import { useMemo, useState, useEffect } from 'react'

import { CATEGORIES } from '../constants/categories'
import { getCardById } from '../data/cards'
import type { GameSubModes } from '../types'
import { useRoom } from '../context/RoomContext'

const defaultSubModes: GameSubModes = { classic: true, gestures: false, charades: false }

export const TeamsCardView = () => {
  const { currentRoom, processTeamsCardAction } = useRoom()
  const state = currentRoom?.teamsGameState
  const [factRevealed, setFactRevealed] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const roundDurationSec = currentRoom?.settings.roundDurationSec ?? 60
  const roundStartedAt = state?.roundStartedAt

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFactRevealed(false)
  }, [state?.currentCardIndexInRound])

  useEffect(() => {
    if (roundStartedAt == null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft(roundDurationSec)
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roundStartedAt) / 1000)
      const left = Math.max(0, roundDurationSec - elapsed)
      setSecondsLeft(left)
    }, 500)
    return () => clearInterval(t)
  }, [roundStartedAt, roundDurationSec])

  const card = useMemo(() => {
    if (!state || state.phase !== 'round' || state.currentCardIndexInRound >= state.roundCardIds.length)
      return null
    return getCardById(state.roundCardIds[state.currentCardIndexInRound])
  }, [state])

  if (!currentRoom || currentRoom.settings.mode !== 'teams' || !state || state.phase !== 'round') {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Нет активной карточки.
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Раунд завершён. Перейдите к результатам.
        </div>
      </div>
    )
  }

  const subModes: GameSubModes = currentRoom.settings.gameSubModes ?? defaultSubModes
  const isClassic = subModes.classic
  const isGestures = subModes.gestures
  const isCharades = subModes.charades
  const showForbidden = isClassic && card.forbidden.length > 0
  const showFactButton = !isGestures && !isCharades
  const currentTeam = currentRoom.teams[state.currentTeamIndex]
  const categoryMeta = CATEGORIES[card.category]
  const timeExpired = secondsLeft === 0
  const progressLabel = timeExpired
    ? 'Последнее слово'
    : `Карточка № ${state.currentCardIndexInRound + 1}`

  const footerWithFactOnly = showFactButton && factRevealed

  return (
    <div className="flex min-h-[100svh] flex-col bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <div>
            <p className="text-sm text-sky-400">Раунд {state.currentRound}</p>
            <p className="text-lg font-semibold">
              Объясняет: {currentTeam?.name ?? 'Команда'} · {progressLabel}
            </p>
          </div>
          {secondsLeft != null && (
            <div className="shrink-0 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-center">
              <p className="text-xl font-mono font-semibold tabular-nums text-slate-100">{secondsLeft}</p>
            </div>
          )}
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 space-y-4">
          <p className="text-2xl font-bold text-slate-100">{card.word}</p>

          {showForbidden && (
            <div className="rounded-xl border border-[#722f37]/60 bg-[#722f37]/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-200">Запрещенные слова</p>
              <div className="flex flex-wrap gap-2">
                {card.forbidden.map((w) => (
                  <span
                    key={w}
                    className="rounded-xl bg-[#722f37]/80 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(factRevealed || isCharades) && (
            <div className="rounded-xl border border-sky-500/50 bg-sky-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Факт</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-100">{card.fact}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-600 bg-slate-800/50 py-2 text-center text-sm text-slate-300">
            <span className="mr-1">{categoryMeta.icon}</span>
            {categoryMeta.label}
          </div>
        </section>

        <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 px-4 pt-4 pb-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {footerWithFactOnly ? (
              <div className="flex w-full gap-4">
                <button
                  type="button"
                  onClick={() => processTeamsCardAction('skip', timeExpired)}
                  className="w-1/2 rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-red-600"
                >
                  Пропустить
                </button>
                <button
                  type="button"
                  onClick={() => processTeamsCardAction('fact', false)}
                  className="w-1/2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-emerald-500"
                >
                  Принять
                </button>
              </div>
            ) : (
              <>
                {showFactButton && !factRevealed && (
                  <button
                    type="button"
                    onClick={() => setFactRevealed(true)}
                    className="w-full rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-sky-500"
                  >
                    Подсказка (-0,5 балла)
                  </button>
                )}

                <div className="flex w-full gap-4">
                  <button
                    type="button"
                    onClick={() => processTeamsCardAction('skip', timeExpired)}
                    className="w-1/2 rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-red-600"
                  >
                    Пропустить
                  </button>
                  <button
                    type="button"
                    onClick={() => processTeamsCardAction('accept', timeExpired)}
                    className="w-1/2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white text-center transition hover:bg-emerald-500"
                  >
                    Принять
                  </button>
                </div>
              </>
            )}
          </div>
        </footer>

      </div>
    </div>
  )
}

export default TeamsCardView
