import { useState } from 'react'

import { getCardById } from '../data/cards'
import { useRoom } from '../context/RoomContext'
import { Toggle } from './Toggle'

export const TeamsWordConfirmation = () => {
  const { currentRoom, applyRoundWordConfirmation } = useRoom()
  const state = currentRoom?.teamsGameState

  // only user overrides; базовое значение вычисляем на лету из действий раунда
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  if (!currentRoom || currentRoom.settings.mode !== 'teams' || !state || state.phase !== 'wordConfirmation') {
    return null
  }

  const currentTeam = currentRoom.teams[state.currentTeamIndex]
  const roundCardActions = state.roundCardActions ?? {}
  const shownIds = state.roundCardIds.filter((id) => roundCardActions[id] != null)

  const isCountedByDefault = (cardId: string): boolean => {
    const action = roundCardActions[cardId] ?? 'skip'
    return action === 'accept' || action === 'fact'
  }

  const handleConfirm = () => {
    applyRoundWordConfirmation(overrides)
  }

  const toggleCard = (cardId: string, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [cardId]: value }))
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold">
          Подтверждение слов · {currentTeam?.name ?? 'Команда'}
        </h1>
        <p className="text-sm text-slate-400">
          Отметьте, какие слова засчитать. Остальные не повлияют на счёт.
        </p>
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <ul className="space-y-2">
            {shownIds.map((cardId) => {
              const card = getCardById(cardId)
              const action = roundCardActions[cardId] ?? 'skip'
              const counted =
                cardId in overrides ? overrides[cardId] : isCountedByDefault(cardId)
              return (
                <li
                    key={cardId}
                    className="relative flex items-center justify-between gap-2
                              rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3"
                  >
                    <span
                      className="min-w-0 max-w-[30%] flex-1 font-medium text-slate-100 whitespace-normal"
                    >
                      {card?.word ?? cardId}
                    </span>
                    <div className="relative shrink-0 flex items-center">
                    {action === 'fact' ? (
                      <span
                        className="absolute right-full mr-3
                   rounded-xl bg-red-900/70 px-3 py-1 text-sm font-semibold text-red-100"
                      >
                        0.5
                      </span>
                    ) : (
                      <span className="w-10" />
                    )}

                    <div className="shrink-0">
                      <Toggle
                        checked={counted}
                        onChange={(v) => toggleCard(cardId, v)}
                        aria-label={`${card?.word ?? cardId}`}
                      >
                      </Toggle>
                      </div>
                    </div>
                  </li>


              )
            })}
          </ul>
        </section>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeamsWordConfirmation
