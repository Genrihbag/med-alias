import { useState, useEffect } from 'react'

import { useRoom } from '../context/RoomContext'

interface TeamsRoundResultsProps {
  onBackToHome: () => void
}

export const TeamsRoundResults = ({ onBackToHome }: TeamsRoundResultsProps) => {
  const { currentRoom, startTeamsRound, finishTeamsGame } = useRoom()
  const state = currentRoom?.teamsGameState
  const pointsToWin = currentRoom?.settings.pointsToWin ?? 25
  const [countdown, setCountdown] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  if (!currentRoom || currentRoom.settings.mode !== 'teams' || !state) {
    return null
  }

  const sortedTeams = [...currentRoom.teams].sort((a, b) => b.score - a.score)
  const hasWinner = sortedTeams.some((t) => t.score >= pointsToWin)
  const nextTeamIndex = (state.currentTeamIndex + 1) % currentRoom.teams.length
  const nextTeam = currentRoom.teams[nextTeamIndex]

  const handleStartRound = () => {
    if (hasWinner) return
    setStarting(true)
    setCountdown(5)
  }

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const t = setTimeout(() => {
      if (countdown === 1) {
        startTeamsRound()
        setCountdown(null)
        setStarting(false)
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [countdown, startTeamsRound])

  const handleFinishGame = () => {
    finishTeamsGame()
    onBackToHome()
  }

  const showCountdown = countdown !== null && countdown > 0

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 px-4 py-8 text-slate-100">
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95">
          <p className="text-slate-400">Раунд начнётся через</p>
          <p className="text-8xl font-bold tabular-nums text-sky-400">{countdown}</p>
        </div>
      )}
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">
          Раунд {state.currentRound} завершён
        </h1>
        {!hasWinner && nextTeam && (
          <p className="rounded-xl border-2 border-sky-500 bg-sky-500/10 px-4 py-3 text-lg font-semibold text-sky-300">
            Следующая команда: {nextTeam.name}
          </p>
        )}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Счёт по командам</h2>
          <ul className="space-y-2">
            {sortedTeams.map((team, index) => {
              const isNext = !hasWinner && team.id === nextTeam?.id
              return (
                <li
                  key={team.id}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    isNext
                      ? 'border-2 border-sky-500 bg-sky-500/10'
                      : 'bg-slate-900/80'
                  }`}
                >
                  <span className="font-medium text-slate-100">
                    {index + 1}. {team.name}
                  </span>
                  <span className="font-mono text-lg font-semibold text-sky-400">
                    {team.score} очк.
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        <p className="text-xs text-slate-400">
          Для победы нужно {pointsToWin} очков.
        </p>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          {hasWinner ? (
            <button
              type="button"
              onClick={handleFinishGame}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Главное меню
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRound}
              disabled={starting}
              className="w-full rounded-lg bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300 disabled:opacity-70"
            >
              Начать игру
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamsRoundResults
