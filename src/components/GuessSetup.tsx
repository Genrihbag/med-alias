import { useState } from 'react'

import { RULES_GUESS } from '../constants/rules'

import {
  CATEGORIES,
  DEFAULT_GUESS_SETTINGS,
  GUESS_WORD_DEFAULT,
  GUESS_WORD_MAX,
  GUESS_WORD_MIN,
  GUESS_WORD_STEP,
} from '../constants/categories'
import { getCardCountByCategory, hasEnoughCards } from '../data/cards'
import type { CategoryId, RoomSettings } from '../types'
import { useRoom } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import { RulesModal } from './RulesModal'

interface GuessSetupProps {
  onBack: () => void
  onCreated: () => void
}

export const GuessSetup = ({ onBack, onCreated }: GuessSetupProps) => {
  const { user } = useAuth()
  const { createRoom } = useRoom()
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(
    DEFAULT_GUESS_SETTINGS.categories,
  )
  const [totalQuestions, setTotalQuestions] = useState<number>(
    DEFAULT_GUESS_SETTINGS.totalQuestions ?? GUESS_WORD_DEFAULT,
  )
  const [secondsPerWord, setSecondsPerWord] = useState<number>(
    DEFAULT_GUESS_SETTINGS.roundDurationSec ?? 60,
  )
  const [showRules, setShowRules] = useState(false)

  const toggleCategory = (categoryId: CategoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    )
  }

  const handleCreateRoom = () => {
    if (selectedCategories.length === 0) return
    const settings: RoomSettings = {
      ...DEFAULT_GUESS_SETTINGS,
      categories: selectedCategories,
      totalQuestions,
      roundDurationSec: secondsPerWord,
    }

    const room = createRoom(settings)
    if (room) onCreated()
  }

  const enoughCards = hasEnoughCards(selectedCategories, totalQuestions)
  const canCreate = !!user && selectedCategories.length > 0 && enoughCards
  const cardCountByCategory = getCardCountByCategory()

  return (
    <>
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-violet-400">Режим</p>
            <h1 className="text-2xl font-semibold">Онлайн режим</h1>
            <p className="mt-1 text-xs text-slate-300">
              Онлайн-квиз без ведущего: каждый игрок отвечает на одни и те же вопросы, очки
              считаются по игрокам.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Главный экран
          </button>
        </div>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Категории</h2>
          <p className="text-xs text-slate-400">
            Из выбранных категорий будут случайным образом выбраны вопросы на всю сессию.
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
                      ? 'border-violet-400 bg-violet-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-slate-100">{category.label}</span>
                    <span className="text-[11px] text-slate-400">{category.description}</span>
                    <span className="text-[11px] text-slate-500">Слов: {cardCountByCategory[category.id]}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Количество слов</h2>
          <p className="text-xs text-slate-400">
            Выберите количество слов до {GUESS_WORD_MAX}. В выбранных категориях
            должно хватать карточек.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() =>
                setTotalQuestions((n) => Math.max(GUESS_WORD_MIN, n - GUESS_WORD_STEP))
              }
              disabled={totalQuestions <= GUESS_WORD_MIN}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-600 text-xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[4rem] text-center text-2xl font-semibold tabular-nums">
              {totalQuestions}
            </span>
            <button
              type="button"
              onClick={() =>
                setTotalQuestions((n) => Math.min(GUESS_WORD_MAX, n + GUESS_WORD_STEP))
              }
              disabled={totalQuestions >= GUESS_WORD_MAX}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-600 text-xl font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              +
            </button>
          </div>
          {!enoughCards && selectedCategories.length > 0 && (
            <p className="text-amber-400 text-xs">
              В выбранных категориях недостаточно карточек ({totalQuestions} нужно). Добавьте
              категории или уменьшите число слов.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Время на одно слово (сек)</h2>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSecondsPerWord(sec)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  secondsPerWord === sec
                    ? 'bg-violet-400 text-slate-950'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
              >
                {sec} сек
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            {!user && (
              <span className="text-amber-400">Войдите в аккаунт, чтобы создать комнату. </span>
            )}
            В этой сессии игроков может быть до 50 — каждый отвечает со своего устройства.
          </p>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Правила
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreateRoom}
            className="rounded-lg bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/30 transition enabled:hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Создать комнату
          </button>
        </div>
      </div>
    </div>
      {showRules && (
        <RulesModal title="Правила Угадайки" onClose={() => setShowRules(false)}>
          {RULES_GUESS}
        </RulesModal>
      )}
    </>
  )
}

export default GuessSetup

