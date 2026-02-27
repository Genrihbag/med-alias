export interface AuthUser {
  id: string
  name: string
}

export type CategoryId =
  | 'anatomy' // 🦴 Анатомия и органы
  | 'dental' // 🦷 Стоматология и ортодонтия
  | 'diseases' // 🏥 Болезни и симптомы
  | 'tools' // 💊 Лекарства и инструменты
  | 'facts' // 🧬 Интересные факты
  | 'professions' // 🩺 Медицинские профессии

export interface Card {
  id: string
  word: string
  category: CategoryId
  forbidden: string[]
  fact: string
}

export type GameMode = 'teams' | 'guess'

export interface Player {
  id: string
  name: string
  score: number
}

export interface Team {
  id: string
  name: string
  playerIds: string[]
  score: number
}

export interface GameSubModes {
  classic: boolean
  gestures: boolean
  charades: boolean
}

export interface RoomSettings {
  maxPlayers: number
  mode: GameMode
  categories: CategoryId[]
  roundDurationSec: number
  totalQuestions?: number
  /** teams mode: number of players (2–50) */
  playerCount?: number
  /** teams mode: points to win */
  pointsToWin?: number
  /** teams mode: display names for teams */
  teamNames?: string[]
  /** teams mode: classic / gestures / charades */
  gameSubModes?: GameSubModes
  /** teams mode: subtract points on skip */
  skipPenalty?: boolean
}

export type TeamsWizardStep = 'categories' | 'players' | 'teams' | 'roundSettings'

export type RoomStatus = 'lobby' | 'inGame' | 'finished'

/** Teams mode: state for the current round and card flow */
export interface TeamsGameState {
  currentRound: number
  /** Card ids for this round */
  roundCardIds: string[]
  currentCardIndexInRound: number
  /** Index in room.teams of the team that is currently explaining */
  currentTeamIndex: number
  /** Player id of the temporary explainer */
  currentExplainerPlayerId: string
  /** All card ids used in this game (no repeat) */
  usedCardIdsInGame: string[]
  /** Last 3 rounds' card ids for no-repeat rule */
  last3RoundCardIds: string[][]
  /** 'round' = showing card; 'wordConfirmation' = confirm words; 'roundResults' = table between rounds */
  phase: 'round' | 'wordConfirmation' | 'roundResults'
  /** Per-card action for current round (only set when phase is wordConfirmation / for display) */
  roundCardActions?: Record<string, 'skip' | 'accept' | 'fact'>
  /** Timestamp (ms) when current round started, for countdown timer */
  roundStartedAt?: number
}

export interface Room {
  id: string
  hostId: string
  settings: RoomSettings
  players: Player[]
  teams: Team[]
  status: RoomStatus
  currentQuestionIndex: number
  usedCardIds: string[]
  /** Guess mode: timestamp (ms) when current question started */
  guessStartedAt?: number | null
  /** Guess mode: per-question duration in seconds (snapshot from settings) */
  guessPerQuestionSec?: number | null
  /** Set when mode is teams and game has started */
  teamsGameState?: TeamsGameState | null
}

export type AppView =
  | 'welcome'
  | 'teamsSetup'
  | 'guessSetup'
  | 'lobby'
  | 'guessGame'
  | 'results'

export interface GuessResult {
  correct: boolean
  card: Card
}

