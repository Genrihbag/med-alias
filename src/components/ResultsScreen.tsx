import { useMemo } from 'react'

import { useRoom } from '../context/RoomContext'
import { useGame } from '../context/GameContext'

interface ResultsScreenProps {
  onBackToHome: () => void
}

export const ResultsScreen = ({ onBackToHome }: ResultsScreenProps) => {
  const { currentRoom, resetRoomState } = useRoom()
  const { mode, resetGame } = useGame()

  const sortedPlayers = useMemo(() => {
    if (!currentRoom) return []
    return [...currentRoom.players].sort((a, b) => b.score - a.score)
  }, [currentRoom])

  const sortedTeams = useMemo(() => {
    if (!currentRoom || !currentRoom.teams.length) return []
    return [...currentRoom.teams].sort((a, b) => b.score - a.score)
  }, [currentRoom])

  if (!currentRoom) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Результаты недоступны: игра не найдена.
        </div>
      </div>
    )
  }

  const handleBackHome = () => {
    resetGame()
    resetRoomState()
    onBackToHome()
  }

  const isGuessMode = mode === 'guess' || currentRoom.settings.mode === 'guess'
  const isTeamsMode = currentRoom.settings.mode === 'teams'

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <header className="space-y-2">
          <p className="text-sm text-emerald-400">
            {isGuessMode ? 'Режим: Онлайн игра' : isTeamsMode ? 'Режим: Командный' : 'Режим: МедАлиас'}
          </p>
          <h1 className="text-2xl font-semibold">
            {isGuessMode
              ? `Результаты ${currentRoom.id}`
              : isTeamsMode
                ? 'Итоги игры (команды)'
                : 'Итоги игры'}
          </h1>
          {!isGuessMode && (
            <p className="text-xs text-slate-300">
              {isTeamsMode ? 'Очки по командам.' : 'Очки по игрокам.'}
            </p>
          )}
        </header>

        {isGuessMode ? (
          <section className="space-y-3">
            {sortedPlayers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Похоже, в этой комнате ещё нет игроков.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Место</th>
                      <th className="px-3 py-2">Игрок</th>
                      <th className="px-3 py-2 text-right">Очки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((player, index) => (
                      <tr
                        key={player.id}
                        className={
                          index === 0
                            ? 'bg-emerald-500/10 text-emerald-100'
                            : 'odd:bg-slate-900/60 even:bg-slate-900/30'
                        }
                      >
                        <td className="px-3 py-2 text-sm">{index + 1}</td>
                        <td className="px-3 py-2 text-sm">{player.name}</td>
                        <td className="px-3 py-2 text-right text-sm">{player.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              {isTeamsMode ? 'Таблица команд' : 'Таблица лидеров'}
            </h2>
            {isTeamsMode ? (
              sortedTeams.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">Нет данных по командам.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-950/80 text-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Место</th>
                        <th className="px-3 py-2">Команда</th>
                        <th className="px-3 py-2 text-right">Очки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, index) => (
                        <tr
                          key={team.id}
                          className={
                            index === 0
                              ? 'bg-emerald-500/10 text-emerald-100'
                              : 'odd:bg-slate-900/60 even:bg-slate-900/30'
                          }
                        >
                          <td className="px-3 py-2 text-sm">{index + 1}</td>
                          <td className="px-3 py-2 text-sm">{team.name}</td>
                          <td className="px-3 py-2 text-right text-sm">{team.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : sortedPlayers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Похоже, в этой комнате ещё нет игроков.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-950/80 text-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Место</th>
                      <th className="px-3 py-2">Игрок</th>
                      <th className="px-3 py-2 text-right">Очки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((player, index) => (
                      <tr
                        key={player.id}
                        className={
                          index === 0
                            ? 'bg-emerald-500/10 text-emerald-100'
                            : 'odd:bg-slate-900/60 even:bg-slate-900/30'
                        }
                      >
                        <td className="px-3 py-2 text-sm">{index + 1}</td>
                        <td className="px-3 py-2 text-sm">{player.name}</td>
                        <td className="px-3 py-2 text-right text-sm">{player.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleBackHome}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            Главный экран
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultsScreen

