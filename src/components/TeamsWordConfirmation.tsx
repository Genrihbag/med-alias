import { useMemo, useState } from 'react'

import { getCardById } from '../data/cards'
import { useRoom } from '../context/RoomContext'
import { Toggle } from './Toggle'

const actionLabel = (action: 'skip' | 'accept' | 'fact'): string => {
  switch (action) {
    case 'accept':
      return 'Принято'
    case 'fact':
      return 'Факт (0.5)'
    case 'skip':
      return 'Пропуск'
    default:
      return action
  }
}

export const TeamsWordConfirmation = () => {
  const { currentRoom, applyRoundWordConfirmation } = useRoom()
  const state = currentRoom?.teamsGameState

  const defaultCount = useMemo(() => {
    const out: Record<string, boolean> = {}
    if (!state?.roundCardIds || !state.roundCardActions) return out
    for (const cardId of state.roundCardIds) {
      const action = state.roundCardActions[cardId] ?? 'skip'
      out[cardId] = action === 'accept' || action === 'fact'
    }
    return out
  }, [state?.roundCardIds, state?.roundCardActions])

  const [countByCardId, setCountByCardId] = useState<Record<string, boolean>>(defaultCount)

  if (!currentRoom || currentRoom.settings.mode !== 'teams' || !state || state.phase !== 'wordConfirmation') {
    return null
  }

  const currentTeam = currentRoom.teams[state.currentTeamIndex]
  const roundCardActions = state.roundCardActions ?? {}

  const handleConfirm = () => {
    applyRoundWordConfirmation(countByCardId)
  }

  const toggleCard = (cardId: string, value: boolean) => {
    setCountByCardId((prev) => ({ ...prev, [cardId]: value }))
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold">
          Подтверждение слов · {currentTeam?.name ?? 'Команда'}
        </h1>
        <p className="text-sm text-slate-400">
          Отметьте, какие слова засчитать. Остальные не повлияют на счёт.
        </p>
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <ul className="space-y-2">
            {state.roundCardIds.map((cardId) => {
              const card = getCardById(cardId)
              const action = roundCardActions[cardId] ?? 'skip'
              const counted = countByCardId[cardId] ?? defaultCount[cardId]
              return (
                <li
                  key={cardId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3"
                >
                  <span className="font-medium text-slate-100">{card?.word ?? cardId}</span>
                  {action === 'fact' ? (
                    <span className="rounded-lg bg-red-900/70 px-3 py-1 text-sm font-semibold text-red-100">
                      0.5
                    </span>
                  ) : (
                    <span className="w-10" />
                  )}
                  <span className="text-xs text-slate-400">{actionLabel(action)}</span>
                  <Toggle
                    checked={counted}
                    onChange={(v) => toggleCard(cardId, v)}
                    aria-label={`Засчитать: ${card?.word ?? cardId}`}
                  >
                    Засчитать
                  </Toggle>
                </li>
              )
            })}
          </ul>
        </section>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeamsWordConfirmation
