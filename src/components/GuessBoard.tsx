import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { CATEGORIES } from '../constants/categories'
import { getCardById } from '../data/cards'
import { useRoom } from '../context/RoomContext'
import { useGame } from '../context/GameContext'

const CORRECT_ANSWER_DURATION_SEC = 5

const preventCopy = (e: React.ClipboardEvent) => {
  e.preventDefault()
}

export const GuessBoard = () => {
  const { currentRoom } = useRoom()
  const { hasAnswered, lastResult, questionNumber, submitGuess, nextQuestion } = useGame()
  const [answer, setAnswer] = useState('')
  const [usedHint, setUsedHint] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [hintRevealed, setHintRevealed] = useState(false)
  const [correctAnswerSecondsLeft, setCorrectAnswerSecondsLeft] = useState<number | null>(null)
  const secondsPerWord = currentRoom?.settings.roundDurationSec ?? 60
  const [secondsLeft, setSecondsLeft] = useState(secondsPerWord)

  const totalQuestions =
    currentRoom?.settings.totalQuestions ?? currentRoom?.usedCardIds.length ?? 0

  const currentCard = useMemo(() => {
    if (!currentRoom || currentRoom.usedCardIds.length === 0) return null
    if (hasAnswered && lastResult) return lastResult.card
    const index = currentRoom.currentQuestionIndex
    const cardId = currentRoom.usedCardIds[index]
    return getCardById(cardId) ?? null
  }, [currentRoom, hasAnswered, lastResult])

  const isFinished = currentRoom?.status === 'finished'

  const commitAndNext = useCallback(() => {
    if (hasAnswered || isFinished) return
    submitGuess(answer.trim() || '', usedHint)
    setAnswer('')
    setUsedHint(false)
    setHintRevealed(false)
  }, [answer, hasAnswered, isFinished, submitGuess, usedHint])

  useEffect(() => {
    if (!currentRoom || currentRoom.settings.mode !== 'guess' || isFinished || hasAnswered) return
    const perWord = currentRoom.settings.roundDurationSec ?? 60
    setSecondsLeft(perWord)
  }, [currentRoom?.currentQuestionIndex, currentRoom?.settings.mode, currentRoom?.settings.roundDurationSec, isFinished, hasAnswered])

  useEffect(() => {
    setUsedHint(false)
    setHintRevealed(false)
  }, [currentRoom?.currentQuestionIndex])

  useEffect(() => {
    if (hasAnswered || isFinished || !currentCard) return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [currentCard, hasAnswered, isFinished])

  useEffect(() => {
    if (secondsLeft === 0 && !hasAnswered && !isFinished) {
      commitAndNext()
    }
  }, [secondsLeft, hasAnswered, isFinished, commitAndNext])

  // Start 5s correct-answer screen when user has just answered
  useEffect(() => {
    if (hasAnswered && lastResult && correctAnswerSecondsLeft === null) {
      setCorrectAnswerSecondsLeft(CORRECT_ANSWER_DURATION_SEC)
    }
    if (!hasAnswered) setCorrectAnswerSecondsLeft(null)
  }, [hasAnswered, lastResult])

  useEffect(() => {
    if (correctAnswerSecondsLeft === null || correctAnswerSecondsLeft <= 0) return
    const t = setTimeout(() => {
      if (correctAnswerSecondsLeft === 1) {
        setAnswer('')
        nextQuestion()
        setCorrectAnswerSecondsLeft(null)
      } else {
        setCorrectAnswerSecondsLeft(correctAnswerSecondsLeft - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [correctAnswerSecondsLeft, nextQuestion])

  if (!currentRoom || currentRoom.settings.mode !== 'guess') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Сессия Угадайки не найдена.
        </div>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Вопросы ещё не готовы. Попросите ведущего начать сессию.
        </div>
      </div>
    )
  }

  const categoryMeta = CATEGORIES[currentCard.category]

  const doSubmit = (finalAnswer: string) => {
    if (hasAnswered || isFinished) return
    submitGuess(finalAnswer, usedHint)
    setAnswer('')
    setShowEmptyConfirm(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (hasAnswered || isFinished) return
    const trimmed = answer.trim()
    if (trimmed === '') {
      setShowEmptyConfirm(true)
      return
    }
    doSubmit(trimmed)
  }

  const handleConfirmEmpty = () => {
    doSubmit('')
  }

  const showCorrectAnswerScreen = hasAnswered && lastResult && correctAnswerSecondsLeft !== null

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm text-slate-200">
              Вы уверены, что хотите отправить пустой ответ?
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmEmpty}
                className="flex-1 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-violet-400"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectAnswerScreen && lastResult && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/95 px-4">
          <p className="mb-2 text-sm text-slate-400">Правильный ответ</p>
          <p className="text-3xl font-bold text-violet-300">{lastResult.card.word}</p>
          <p className="mt-4 max-w-md text-center text-sm text-slate-300">
            {lastResult.card.fact}
          </p>
          <p className="mt-6 text-slate-500">
            Следующий вопрос через {correctAnswerSecondsLeft}…
          </p>
        </div>
      )}

      <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-violet-400">Угадайка</p>
            <h1 className="text-2xl font-semibold">
              Слово {Math.min(questionNumber, totalQuestions)} / {totalQuestions || '?'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Таймер</p>
              <p className="text-xl font-mono font-semibold tabular-nums text-slate-100">
                {hasAnswered ? '—' : secondsLeft}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Категория</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-100">
                <span className="text-lg">{categoryMeta.icon}</span>
                <span>{categoryMeta.label}</span>
              </p>
            </div>
          </div>
        </header>

        <section
          className="select-none rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          onCopy={preventCopy}
          onCut={preventCopy}
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400">По этому факту угадайте термин</p>
          <p className="mt-2 text-base leading-relaxed text-slate-200">
            {currentCard.fact}
          </p>
        </section>

        {currentCard.forbidden.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Запрещённые слова</p>
            {hintRevealed ? (
              <p className="mt-2 text-sm text-amber-300">{currentCard.forbidden.join(', ')}</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHintRevealed(true)
                  setUsedHint(true)
                }}
                disabled={hasAnswered || isFinished}
                className="mt-2 rounded-lg border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
              >
                Подсказка (−0.5 балла)
              </button>
            )}
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-slate-200">
            Ваш ответ (медицинский термин)
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={hasAnswered || isFinished}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
              placeholder="Введите слово"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={hasAnswered || isFinished}
              className="rounded-lg bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/30 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ответить
            </button>
          </div>
        </form>

        {isFinished && (
          <section className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <p>
              Вопросы в этой сессии закончились. Откройте экран результатов, чтобы посмотреть
              таблицу лидеров.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

export default GuessBoard
