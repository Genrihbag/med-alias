import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { CATEGORIES } from '../constants/categories'
import { getCardById } from '../data/cards'
import { useRoom } from '../context/RoomContext'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'

const RESULT_DISPLAY_SEC = 5

const preventCopy = (e: React.ClipboardEvent) => {
  e.preventDefault()
}

export const GuessBoard = () => {
  const { currentRoom, advanceGuessQuestion } = useRoom()
  const { hasAnswered, submitGuess } = useGame()
  const { user } = useAuth()
  const [answer, setAnswer] = useState('')
  const [usedHint, setUsedHint] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [hintRevealed, setHintRevealed] = useState(false)
  const secondsPerWord = currentRoom?.guessPerQuestionSec ?? currentRoom?.settings.roundDurationSec ?? 60
  const [secondsLeft, setSecondsLeft] = useState(secondsPerWord)
  const [resultSecondsLeft, setResultSecondsLeft] = useState(RESULT_DISPLAY_SEC)

  const isHost = !!(currentRoom && user && currentRoom.hostId === user.id)
  const isShowingResult = currentRoom?.guessShowingResult ?? false
  const guessLastResult = currentRoom?.guessLastResult ?? null
  const isFinished = currentRoom?.status === 'finished'

  const totalQuestions =
    currentRoom?.settings.totalQuestions ?? currentRoom?.usedCardIds.length ?? 0

  const currentCard = useMemo(() => {
    if (!currentRoom || currentRoom.usedCardIds.length === 0) return null
    if (isShowingResult && guessLastResult) {
      return getCardById(guessLastResult.cardId) ?? null
    }
    const index = currentRoom.currentQuestionIndex
    const cardId = currentRoom.usedCardIds[index]
    return getCardById(cardId) ?? null
  }, [currentRoom, isShowingResult, guessLastResult])

  const currentQuestionNumber =
    currentRoom && currentRoom.usedCardIds.length > 0
      ? Math.min(currentRoom.currentQuestionIndex + 1, totalQuestions || currentRoom.usedCardIds.length)
      : 1

  // Reset local flags when question changes
  useEffect(() => {
    setUsedHint(false)
    setHintRevealed(false)
    setAnswer('')
  }, [currentRoom?.currentQuestionIndex])

  // Question timer: sync to server's guessStartedAt
  useEffect(() => {
    if (!currentRoom || currentRoom.settings.mode !== 'guess') return
    if (!currentRoom.guessStartedAt || isFinished || isShowingResult) return

    const recompute = () => {
      const elapsedSec = Math.floor((Date.now() - currentRoom.guessStartedAt!) / 1000)
      const left = Math.max(0, secondsPerWord - elapsedSec)
      setSecondsLeft(left)
    }

    recompute()
    const t = setInterval(recompute, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.guessStartedAt, currentRoom?.settings.mode, secondsPerWord, isFinished, isShowingResult])

  // Auto-submit on timer expiry (host only to avoid duplicate submissions)
  const commitAndNext = useCallback(() => {
    if (hasAnswered || isFinished || isShowingResult) return
    submitGuess(answer.trim() || '', usedHint)
    setAnswer('')
    setUsedHint(false)
    setHintRevealed(false)
  }, [answer, hasAnswered, isFinished, isShowingResult, submitGuess, usedHint])

  useEffect(() => {
    if (secondsLeft === 0 && !hasAnswered && !isFinished && !isShowingResult && isHost) {
      commitAndNext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, hasAnswered, isFinished, isShowingResult, isHost])

  // Result timer: sync to server's guessResultShownAt
  useEffect(() => {
    if (!isShowingResult || !currentRoom?.guessResultShownAt) {
      setResultSecondsLeft(RESULT_DISPLAY_SEC)
      return
    }

    const recompute = () => {
      const elapsedSec = Math.floor((Date.now() - currentRoom.guessResultShownAt!) / 1000)
      const left = Math.max(0, RESULT_DISPLAY_SEC - elapsedSec)
      setResultSecondsLeft(left)
    }

    recompute()
    const t = setInterval(recompute, 500)
    return () => clearInterval(t)
  }, [isShowingResult, currentRoom?.guessResultShownAt])

  // When result timer reaches 0, host advances to next question
  useEffect(() => {
    if (resultSecondsLeft <= 0 && isShowingResult && isHost) {
      advanceGuessQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultSecondsLeft, isShowingResult, isHost])

  if (!currentRoom || currentRoom.settings.mode !== 'guess') {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Сессия Угадайки не найдена.
        </div>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl bg-slate-900/80 px-6 py-4 text-center shadow-lg">
          Вопросы ещё не готовы. Попросите организатора начать сессию.
        </div>
      </div>
    )
  }

  const categoryMeta = CATEGORIES[currentCard.category]

  const doSubmit = (finalAnswer: string) => {
    if (hasAnswered || isFinished || isShowingResult) return
    submitGuess(finalAnswer, usedHint)
    setAnswer('')
    setShowEmptyConfirm(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (hasAnswered || isFinished || isShowingResult) return
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

  const resultCard = guessLastResult ? getCardById(guessLastResult.cardId) : null

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-slate-950 px-4 text-slate-100">
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
                className="flex-1 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmEmpty}
                className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-violet-400"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {isShowingResult && resultCard && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/95 px-4">
          <p className="mb-1 text-xs text-slate-500">
            Ответил(а): {guessLastResult?.answeredByName ?? '—'}
          </p>
          <p className="mb-2 text-sm text-slate-400">
            {guessLastResult?.correct ? 'Правильно!' : 'Неправильно'}
          </p>
          <p className="text-3xl font-bold text-violet-300">{resultCard.word}</p>
          <p className="mt-4 max-w-md text-center text-sm text-slate-300">
            {resultCard.fact}
          </p>
          <p className="mt-6 text-slate-500">
            Следующий вопрос через {resultSecondsLeft}…
          </p>
        </div>
      )}

      <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-violet-400">Онлайн игра</p>
            <h1 className="text-2xl font-semibold">
              Слово {currentQuestionNumber} / {totalQuestions || '?'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-center">
              <p className="text-xl font-mono font-semibold tabular-nums text-slate-100">
                {isShowingResult || hasAnswered ? '—' : secondsLeft}
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
          <section className="rounded-2xl border border-emerald-600/60 bg-emerald-900/40 p-4">
            <p className="text-[11px] uppercase tracking-wide text-emerald-300">Подсказки</p>
            {hintRevealed ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {currentCard.forbidden.map((word) => (
                  <span
                    key={word}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-50"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHintRevealed(true)
                  setUsedHint(true)
                }}
                disabled={hasAnswered || isFinished || isShowingResult}
                className="mt-2 w-full rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Показать подсказки (−0.5 балла)
              </button>
            )}
          </section>
        )}

        <div className="rounded-xl border border-slate-600 bg-slate-800/50 py-2 text-center text-sm text-slate-300">
          <span className="mr-1 text-lg">{categoryMeta.icon}</span>
          <span>{categoryMeta.label}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-slate-200">
            Ваш ответ (медицинский термин)
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={hasAnswered || isFinished || isShowingResult}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
              placeholder="Введите слово"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={hasAnswered || isFinished || isShowingResult}
              className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/30 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
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
