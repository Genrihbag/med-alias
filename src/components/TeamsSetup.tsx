import {useEffect, useState} from 'react'

import {CATEGORIES, DEFAULT_TEAMS_SETTINGS} from '../constants/categories'
import {RULES_TEAMS} from '../constants/rules'
import {getCardCountByCategory} from '../data/cards'
import type {
    CategoryId,
    GameSubModes,
    RoomSettings,
    TeamsWizardStep,
} from '../types'
import {useRoom} from '../context/RoomContext'
import {useAuth} from '../context/AuthContext'
import {Toggle} from './Toggle'
import {RulesModal} from './RulesModal'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 50
const MIN_TEAMS = 2
const MAX_TEAMS = 10
const ROUND_STEP = 30
const MIN_ROUND_SEC = 30
const MAX_ROUND_SEC = 240
const POINTS_STEP = 25
const MIN_POINTS_TO_WIN = 25
const MAX_POINTS_TO_WIN = 200
const DEFAULT_POINTS_TO_WIN = 25

/** Max teams by player count: <10→3, <20→5, <30→7, <40→9, <50→10; at least 2 per team; minimum 2 teams. */
function getMaxTeams(playerCount: number): number {
    const cap =
        playerCount < 10 ? 3
            : playerCount < 20 ? 5
                : playerCount < 30 ? 7
                    : playerCount < 40 ? 9
                        : 10
    return Math.max(MIN_TEAMS, Math.min(cap, MAX_TEAMS, Math.floor(playerCount / 2)))
}

/** Distribute playerCount across teamCount teams (fill from top). */
function teamSizes(playerCount: number, teamCount: number): number[] {
    if (teamCount <= 0) return []
    const base = Math.floor(playerCount / teamCount)
    const remainder = playerCount % teamCount
    const sizes: number[] = []
    for (let i = 0; i < teamCount; i++) {
        sizes.push(i < remainder ? base + 1 : base)
    }
    return sizes
}

interface TeamsSetupProps {
    onBack: () => void
    onCreated: (opts?: { countdown?: 'teams' }) => void
}

export const TeamsSetup = ({onBack, onCreated}: TeamsSetupProps) => {
    const {user} = useAuth()
    const {createRoom} = useRoom()
    const [step, setStep] = useState<TeamsWizardStep>('categories')
    const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(
        DEFAULT_TEAMS_SETTINGS.categories,
    )
    const [playerCount, setPlayerCount] = useState(MIN_PLAYERS)
    const [teamCount, setTeamCount] = useState(MIN_TEAMS)
    const [teamNames, setTeamNames] = useState<string[]>([
        'Команда №1',
        'Команда №2',
    ])
    const [roundDurationSec, setRoundDurationSec] = useState(60)
    const [pointsToWin, setPointsToWin] = useState(DEFAULT_POINTS_TO_WIN)
    const [gameSubModes, setGameSubModes] = useState<GameSubModes>({
        classic: true,
        gestures: false,
        charades: false,
    })
    const [skipPenalty, setSkipPenalty] = useState(false)
    const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null)
    const [editingName, setEditingName] = useState('')
    const [showRules, setShowRules] = useState(false)

    const toggleCategory = (categoryId: CategoryId) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
        )
    }

    const syncTeamNamesToCount = (count: number) => {
        setTeamNames((prev) => {
            if (count <= prev.length) {
                return prev.slice(0, count)
            }
            const next = [...prev]
            while (next.length < count) {
                next.push(`Команда №${next.length + 1}`)
            }
            return next
        })
    }

    const setTeamCountWithSync = (n: number) => {
        const maxTeams = getMaxTeams(playerCount)
        const value = Math.max(MIN_TEAMS, Math.min(maxTeams, n))
        setTeamCount(value)
        syncTeamNamesToCount(value)
    }

    const startEditTeam = (index: number) => {
        setEditingTeamIndex(index)
        setEditingName(teamNames[index] ?? '')
    }

    const saveEditTeam = () => {
        if (editingTeamIndex !== null && editingName.trim()) {
            setTeamNames((prev) => {
                const next = [...prev]
                next[editingTeamIndex] = editingName.trim()
                return next
            })
        }
        setEditingTeamIndex(null)
        setEditingName('')
    }

    const sizes = teamSizes(playerCount, teamCount)

    // При изменении числа участников уменьшать число команд, если превышен новый лимит
    useEffect(() => {
        const maxTeams = getMaxTeams(playerCount)
        if (teamCount > maxTeams) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTeamCount(maxTeams)
            syncTeamNamesToCount(maxTeams)
        }
    }, [playerCount, teamCount])

    const handleCreateRoom = () => {
        if (selectedCategories.length === 0) return
        const settings: RoomSettings = {
            ...DEFAULT_TEAMS_SETTINGS,
            categories: selectedCategories,
            roundDurationSec,
            maxPlayers: playerCount,
            playerCount,
            pointsToWin,
            teamNames: teamNames.slice(0, teamCount),
            gameSubModes: {...gameSubModes},
            skipPenalty,
        }
        const room = createRoom(settings)
        if (room) onCreated({countdown: 'teams'})
    }

    const canGoNextFromCategories = selectedCategories.length > 0

    const header = (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="mb-1 text-sm text-sky-400">Командный режим</p>
                <h1 className="text-2xl font-semibold">
                    {step === 'categories' && 'Шаг 1: Категории'}
                    {step === 'players' && 'Шаг 2: Количество участников'}
                    {step === 'teams' && 'Шаг 3: Команды'}
                    {step === 'roundSettings' && 'Шаг 4: Настройки раунда'}
                </h1>
            </div>
        </div>
    )

    const cardCountByCategory = getCardCountByCategory()

    if (step === 'categories') {
        return (
            <>
                <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 p-4 text-slate-100">
                    <div
                        className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl  bg-slate-900/80 px-4 py-8 shadow-2xl">
                        {header}
                        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-400">
                                Выберите набор тем, по которым команды будут объяснять и угадывать.
                            </p>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                                {Object.values(CATEGORIES).map((category) => {
                                    const checked = selectedCategories.includes(category.id)
                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => toggleCategory(category.id)}
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                                                checked
                                                    ? 'border-sky-400 bg-sky-500/10'
                                                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                                            }`}
                                        >
                                            <span className="text-lg">{category.icon}</span>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] text-slate-100">{category.label}</span>
                                                <span
                                                    className="text-[11px] text-slate-400">{category.description}</span>
                                                <span
                                                    className="text-[11px] text-slate-500">Слов: {cardCountByCategory[category.id]}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                        <div className="flex justify-between gap-4">
                            <div className="w-1/2 flex flex-col items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRules(true)}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Правила
                                </button>
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Главное меню
                                </button>
                            </div>
                            <div className="w-1/2 flex">
                                <button
                                    type="button"
                                    disabled={!canGoNextFromCategories}
                                    onClick={() => setStep('players')}
                                    className="w-full rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Далее
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {showRules && (
                    <RulesModal title="Правила командного режима" onClose={() => setShowRules(false)}>
                        {RULES_TEAMS}
                    </RulesModal>
                )}
            </>
        )
    }

    if (step === 'players') {
        return (
            <>
                <div
                    className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-950 p-4 text-slate-100">
                    <div
                        className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 px-4 py-8 shadow-2xl">
                        {header}
                        <div className="flex flex-1 flex-col items-center justify-center gap-4">
                            <div className="flex items-center justify-center gap-6">
                                <button
                                    type="button"
                                    onClick={() => setPlayerCount((n) => Math.max(MIN_PLAYERS, n - 1))}
                                    disabled={playerCount <= MIN_PLAYERS}
                                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-600 text-2xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min={MIN_PLAYERS}
                                    max={MAX_PLAYERS}
                                    value={playerCount}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value, 10)
                                        if (!Number.isNaN(v)) {
                                            setPlayerCount(Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, v)))
                                        }
                                    }}
                                    className="w-28 border-0 bg-transparent text-center text-7xl font-bold tabular-nums text-sky-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setPlayerCount((n) => Math.min(MAX_PLAYERS, n + 1))}
                                    disabled={playerCount >= MAX_PLAYERS}
                                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-600 text-2xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400">
                                Сколько человек будет играть? (от {MIN_PLAYERS} до {MAX_PLAYERS})
                            </p>
                        </div>
                        <div className="flex justify-between gap-4">
                            <div className="w-1/2 flex flex-col items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRules(true)}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Правила
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('categories')}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Назад
                                </button>
                            </div>
                            <div className="w-1/2 flex">
                                <button
                                    type="button"
                                    onClick={() => setStep('teams')}
                                    className="w-full rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900"
                                >
                                    Далее
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {showRules && (
                    <RulesModal title="Правила командного режима" onClose={() => setShowRules(false)}>
                        {RULES_TEAMS}
                    </RulesModal>
                )}
            </>
        )
    }

    if (step === 'teams') {
        return (
            <>
                <div
                    className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-950 p-4 text-slate-100">
                    <div
                        className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 px-4 py-8 shadow-2xl">
                        {header}
                        <p className="text-xs text-slate-400">
                            Названия команд можно изменить, нажав на карандаш. Распределение игроков по командам
                            — сверху вниз.
                        </p>
                        <ul className="space-y-3">
                            {teamNames.slice(0, teamCount).map((name, index) => (
                                <li
                                    key={index}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-4"
                                >
                                    <div className="flex flex-col gap-1">
                                        {editingTeamIndex === index ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEditTeam()}
                                                    className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={saveEditTeam}
                                                    className="rounded bg-sky-500 px-2 py-1 text-xs text-slate-900"
                                                >
                                                    OK
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-slate-100">{name}</span>
                                                <span className="text-xs text-slate-400">
                        {sizes[index] ?? 0} чел.
                      </span>
                                            </>
                                        )}
                                    </div>
                                    {editingTeamIndex !== index && (
                                        <button
                                            type="button"
                                            onClick={() => startEditTeam(index)}
                                            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                            aria-label="Редактировать"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                            </svg>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col items-center gap-2 border-t border-slate-800 pt-4">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setTeamCountWithSync(teamCount - 1)}
                                    disabled={teamCount <= MIN_TEAMS}
                                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-600 text-xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                                >
                                    −
                                </button>
                                <span className="min-w-[3rem] text-center text-2xl font-semibold tabular-nums">
                {teamCount}
              </span>
                                <button
                                    type="button"
                                    onClick={() => setTeamCountWithSync(teamCount + 1)}
                                    disabled={teamCount >= getMaxTeams(playerCount)}
                                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-600 text-xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>
                            <span className="text-sm text-slate-400">Количество команд (минимум {MIN_TEAMS})</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <div className="w-1/2 flex flex-col items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRules(true)}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Правила
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('players')}
                                    className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                                >
                                    Назад
                                </button>
                            </div>
                            <div className="w-1/2 flex">
                                <button
                                    type="button"
                                    onClick={() => setStep('roundSettings')}
                                    className="w-full rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900"
                                >
                                    Далее
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {showRules && (
                    <RulesModal title="Правила командного режима" onClose={() => setShowRules(false)}>
                        {RULES_TEAMS}
                    </RulesModal>
                )}
            </>
        )
    }

    // step === 'roundSettings'
    return (
        <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 p-4 text-slate-100">
            <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 px-4 py-4 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm text-sky-400">Командный режим</p>
                        <h1 className="text-2xl font-semibold">
                            {step === 'roundSettings' && 'Шаг 4: Настройки раунда'}
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-xl border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                    >
                        Главный экран
                    </button>
                </div>
                <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <h2 className="text-sm font-semibold text-slate-100">Длительность раунда (сек)</h2>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={() => setRoundDurationSec((s) => Math.max(MIN_ROUND_SEC, s - ROUND_STEP))}
                            disabled={roundDurationSec <= MIN_ROUND_SEC}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                            −
                        </button>
                        <span className="min-w-[4rem] text-center text-xl font-semibold tabular-nums">
              {roundDurationSec}
            </span>
                        <button
                            type="button"
                            onClick={() => setRoundDurationSec((s) => Math.min(MAX_ROUND_SEC, s + ROUND_STEP))}
                            disabled={roundDurationSec >= MAX_ROUND_SEC}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                            +
                        </button>
                    </div>
                </section>
                <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <h2 className="text-sm font-semibold text-slate-100">Очков для победы команды</h2>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={() => setPointsToWin((p) => Math.max(MIN_POINTS_TO_WIN, p - POINTS_STEP))}
                            disabled={pointsToWin <= MIN_POINTS_TO_WIN}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                            −
                        </button>
                        <span className="min-w-[4rem] text-center text-xl font-semibold tabular-nums">
              {pointsToWin}
            </span>
                        <button
                            type="button"
                            onClick={() => setPointsToWin((p) => Math.min(MAX_POINTS_TO_WIN, p + POINTS_STEP))}
                            disabled={pointsToWin >= MAX_POINTS_TO_WIN}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                            +
                        </button>
                    </div>
                </section>
                <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <h2 className="text-sm font-semibold text-slate-100">Режим объяснения (выберите один)</h2>
                    <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="gameSubMode"
                                checked={gameSubModes.classic}
                                onChange={() => setGameSubModes({classic: true, gestures: false, charades: false})}
                                className="h-4 w-4 border-slate-600 bg-slate-900 text-sky-500"
                            />
                            <span
                                className="text-sm text-slate-200">Классика — нельзя называть однокоренные слова</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="gameSubMode"
                                checked={gameSubModes.gestures}
                                onChange={() => setGameSubModes({classic: false, gestures: true, charades: false})}
                                className="h-4 w-4 border-slate-600 bg-slate-900 text-sky-500"
                            />
                            <span className="text-sm text-slate-200">Жесты — показывать только жестами</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="radio"
                                name="gameSubMode"
                                checked={gameSubModes.charades}
                                onChange={() => setGameSubModes({classic: false, gestures: false, charades: true})}
                                className="h-4 w-4 border-slate-600 bg-slate-900 text-sky-500"
                            />
                            <span
                                className="text-sm text-slate-200">Шарады — ведущий отвечает «да»/«нет» на вопросы</span>
                        </label>
                    </div>
                </section>
                <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <Toggle checked={skipPenalty} onChange={setSkipPenalty}>
                        Штраф за пропуск — снимать 1 балл с команды при пропуске слова
                    </Toggle>
                </section>
                <div className="flex justify-between gap-4">
                    <div className="w-1/2 flex flex-col items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => setShowRules(true)}
                            className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                        >
                            Правила
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('teams')}
                            className="w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                        >
                            Назад
                        </button>
                    </div>
                    <div className="w-1/2 flex">
                        <button
                            type="button"
                            onClick={handleCreateRoom}
                            disabled={!user || !canGoNextFromCategories || (!gameSubModes.classic && !gameSubModes.gestures && !gameSubModes.charades)}
                            className="w-full rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-500/30 transition enabled:hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Начать игру
                        </button>
                    </div>
                </div>
            </div>
            {showRules && (
                <RulesModal title="Правила командного режима" onClose={() => setShowRules(false)}>
                    {RULES_TEAMS}
                </RulesModal>
            )}
        </div>
    )
}

export default TeamsSetup
