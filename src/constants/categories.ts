import type { CategoryId, GameMode, RoomSettings } from '../types'

export const CATEGORIES: Record<
  CategoryId,
  {
    id: CategoryId
    label: string
    icon: string
    points: number
    description: string
  }
> = {
  anatomy: {
    id: 'anatomy',
    label: 'Анатомия и органы',
    icon: '🦴',
    points: 1,
    description: 'Органы и анатомические структуры человека.',
  },
  dental: {
    id: 'dental',
    label: 'Стоматология и ортодонтия',
    icon: '🦷',
    points: 2,
    description: 'Зубы, лечение и исправление прикуса.',
  },
  diseases: {
    id: 'diseases',
    label: 'Болезни и симптомы',
    icon: '🏥',
    points: 1,
    description: 'Заболевания и их проявления.',
  },
  tools: {
    id: 'tools',
    label: 'Лекарства и инструменты',
    icon: '💊',
    points: 2,
    description: 'Медикаменты и врачебный инструментарий.',
  },
  facts: {
    id: 'facts',
    label: 'Интересные факты',
    icon: '🧬',
    points: 3,
    description: 'Научные и занимательные факты о медицине.',
  },
  professions: {
    id: 'professions',
    label: 'Медицинские профессии',
    icon: '🩺',
    points: 1,
    description: 'Специальности и роли в здравоохранении.',
  },
}

export const WINNING_SCORE = 30

const allCategories = Object.values(CATEGORIES).map((c) => c.id)

const baseSettings = (
  mode: GameMode,
  overrides: Partial<RoomSettings> = {},
): RoomSettings => ({
  maxPlayers: 4,
  mode,
  categories: allCategories,
  roundDurationSec: 60,
  ...overrides,
})

export const DEFAULT_TEAMS_SETTINGS: RoomSettings = baseSettings('teams', {
  maxPlayers: 6,
})

export const DEFAULT_GUESS_SETTINGS: RoomSettings = baseSettings('guess', {
  maxPlayers: 50,
  totalQuestions: 25,
  roundDurationSec: 60,
})

export const GUESS_WORD_STEP = 5
export const GUESS_WORD_MIN = 5
export const GUESS_WORD_MAX = 50
export const GUESS_WORD_DEFAULT = 25

