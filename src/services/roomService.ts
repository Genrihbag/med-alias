import type {
  AuthUser,
  CategoryId,
  Room,
  RoomSettings,
  Team,
  TeamsGameState,
} from '../types'
import { CATEGORIES } from '../constants/categories'
import {
  getCardsByCategories,
  getCardById,
  hasEnoughCards,
  pickRandomCardsExcluding,
} from '../data/cards'
import type { GuessResult } from '../types'

export type RoomsById = Record<string, Room>

const ROOM_ID_PREFIX = 'MED'

const generateRoomId = (roomsById: RoomsById): string => {
  // simple short code: MED + 3 random digits, avoid collisions within current map
  let id: string
  do {
    const num = Math.floor(100 + Math.random() * 900)
    id = `${ROOM_ID_PREFIX}${num}`
  } while (roomsById[id])
  return id
}

function buildTeamsFromNames(teamNames: string[]): Team[] {
  return teamNames.map((name, i) => ({
    id: `team-${i}`,
    name,
    playerIds: [],
    score: 0,
  }))
}

const createInitialRoom = (
  id: string,
  host: AuthUser,
  settings: RoomSettings,
): Room => {
  const teams: Team[] =
    settings.mode === 'teams' && settings.teamNames?.length
      ? buildTeamsFromNames(settings.teamNames)
      : []
  return {
    id,
    hostId: host.id,
    settings,
    players: [
      {
        id: host.id,
        name: host.name,
        score: 0,
      },
    ],
    teams,
    status: 'lobby',
    currentQuestionIndex: 0,
    usedCardIds: [],
  }
}

export const createRoom = (
  roomsById: RoomsById,
  host: AuthUser,
  settings: RoomSettings,
): { roomsById: RoomsById; room: Room } => {
  const id = generateRoomId(roomsById)
  const room = createInitialRoom(id, host, settings)
  return {
    roomsById: {
      ...roomsById,
      [id]: room,
    },
    room,
  }
}

export const joinRoom = (
  roomsById: RoomsById,
  roomId: string,
  user: AuthUser,
): { roomsById: RoomsById; room: Room | null } => {
  const room = roomsById[roomId]
  if (!room) {
    console.log('[joinRoom] room not found:', roomId, 'knownIds:', Object.keys(roomsById))
    return { roomsById, room: null }
  }
  console.log('[joinRoom] room found:', roomId, 'adding user:', user.name)

  const alreadyInRoom = room.players.some((p) => p.id === user.id)
  const updatedRoom: Room = alreadyInRoom
    ? room
    : {
        ...room,
        players: [
          ...room.players,
          {
            id: user.id,
            name: user.name,
            score: 0,
          },
        ],
      }

  return {
    roomsById: {
      ...roomsById,
      [roomId]: updatedRoom,
    },
    room: updatedRoom,
  }
}

export const leaveRoom = (
  roomsById: RoomsById,
  roomId: string,
  userId: string,
): { roomsById: RoomsById } => {
  const room = roomsById[roomId]
  if (!room) return { roomsById }

  const remainingPlayers = room.players.filter((p) => p.id !== userId)

  // if no players left, remove the room entirely
  if (remainingPlayers.length === 0) {
    const rest: RoomsById = { ...roomsById }
    delete rest[roomId]
    return { roomsById: rest }
  }

  const newHostId =
    room.hostId === userId ? remainingPlayers[0]?.id ?? room.hostId : room.hostId

  const updatedRoom: Room = {
    ...room,
    hostId: newHostId,
    players: remainingPlayers,
  }

  return {
    roomsById: {
      ...roomsById,
      [roomId]: updatedRoom,
    },
  }
}

const prepareGuessCards = (settings: RoomSettings): string[] => {
  const totalQuestions =
    settings.totalQuestions && settings.totalQuestions > 0
      ? settings.totalQuestions
      : 25
  const categories =
    settings.categories.length > 0 ? settings.categories : (Object.keys(CATEGORIES) as CategoryId[])
  const sourceCards = getCardsByCategories(categories)
  if (!hasEnoughCards(categories, totalQuestions)) return []
  const picked = pickRandomCardsExcluding(sourceCards, totalQuestions, [])
  return picked.map((card) => card.id)
}

export const startGuessSession = (
  roomsById: RoomsById,
  roomId: string,
): { roomsById: RoomsById; room: Room | null } => {
  const room = roomsById[roomId]
  if (!room) {
    return { roomsById, room: null }
  }

  const usedCardIds = prepareGuessCards(room.settings)

  const resetPlayers = room.players.map((p) => ({
    ...p,
    score: 0,
  }))

  const updatedRoom: Room = {
    ...room,
    status: 'inGame',
    currentQuestionIndex: 0,
    usedCardIds,
    guessStartedAt: Date.now(),
    guessPerQuestionSec: room.settings.roundDurationSec ?? 60,
    guessShowingResult: false,
    guessLastResult: null,
    guessResultShownAt: null,
    guessCountdownStartedAt: null,
    players: resetPlayers,
  }

  return {
    roomsById: {
      ...roomsById,
      [roomId]: updatedRoom,
    },
    room: updatedRoom,
  }
}

export const submitGuess = (
  roomsById: RoomsById,
  roomId: string,
  userId: string,
  answer: string,
  usedHint?: boolean,
): { roomsById: RoomsById; result: GuessResult | null } => {
  const room = roomsById[roomId]
  if (!room || room.status !== 'inGame') {
    return { roomsById, result: null }
  }

  if (room.guessShowingResult) {
    return { roomsById, result: null }
  }

  const { currentQuestionIndex, usedCardIds } = room
  if (
    currentQuestionIndex < 0 ||
    currentQuestionIndex >= usedCardIds.length ||
    usedCardIds.length === 0
  ) {
    return { roomsById, result: null }
  }

  const cardId = usedCardIds[currentQuestionIndex]
  const card = getCardById(cardId)
  if (!card) {
    return { roomsById, result: null }
  }

  const normalize = (value: string) => value.trim().toLowerCase()

  const correct = normalize(answer) === normalize(card.word)

  let pointsDelta = 0
  if (room.settings.mode === 'guess') {
    pointsDelta = correct ? 1 : 0
    if (usedHint) pointsDelta -= 0.5
  } else {
    pointsDelta = correct ? (CATEGORIES[card.category]?.points ?? 0) : 0
  }
  const players = room.players.map((player) => {
    if (player.id !== userId) return player
    return {
      ...player,
      score: Math.max(0, player.score + pointsDelta),
    }
  })

  const answeredByName = room.players.find((p) => p.id === userId)?.name ?? ''

  const updatedRoom: Room = {
    ...room,
    players,
    guessShowingResult: true,
    guessLastResult: { correct, cardId, answeredByName },
    guessResultShownAt: Date.now(),
  }

  const result: GuessResult = {
    correct,
    card,
  }

  return {
    roomsById: {
      ...roomsById,
      [roomId]: updatedRoom,
    },
    result,
  }
}

export const advanceGuessQuestion = (
  roomsById: RoomsById,
  roomId: string,
): { roomsById: RoomsById; room: Room | null } => {
  const room = roomsById[roomId]
  if (!room || room.status !== 'inGame' || !room.guessShowingResult) {
    return { roomsById, room: null }
  }

  const nextIndex = room.currentQuestionIndex + 1
  const totalQuestions =
    room.settings.totalQuestions && room.settings.totalQuestions > 0
      ? room.settings.totalQuestions
      : room.usedCardIds.length
  const isLast = nextIndex >= totalQuestions

  const updatedRoom: Room = {
    ...room,
    currentQuestionIndex: isLast ? room.currentQuestionIndex : nextIndex,
    guessStartedAt: isLast ? null : Date.now(),
    guessShowingResult: false,
    guessLastResult: null,
    guessResultShownAt: null,
    status: isLast ? 'finished' : 'inGame',
  }

  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
    room: updatedRoom,
  }
}

export const startGuessCountdown = (
  roomsById: RoomsById,
  roomId: string,
): { roomsById: RoomsById; room: Room | null } => {
  const room = roomsById[roomId]
  if (!room) return { roomsById, room: null }
  const updatedRoom: Room = {
    ...room,
    guessCountdownStartedAt: Date.now(),
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
    room: updatedRoom,
  }
}

export type TeamsCardAction = 'skip' | 'accept' | 'fact'

export function startTeamsGame(
  roomsById: RoomsById,
  roomId: string,
): { roomsById: RoomsById; room: Room | null } {
  const room = roomsById[roomId]
  if (!room || room.settings.mode !== 'teams' || room.status !== 'lobby') {
    return { roomsById, room: null }
  }
  const categories =
    room.settings.categories.length > 0
      ? room.settings.categories
      : (Object.keys(CATEGORIES) as CategoryId[])
  const sourceCards = getCardsByCategories(categories)
  const cardsToPick = sourceCards.length
  const picked = pickRandomCardsExcluding(sourceCards, cardsToPick, [])
  const roundCardIds = picked.map((c) => c.id)
  const state: TeamsGameState = {
    currentRound: 1,
    roundCardIds,
    currentCardIndexInRound: 0,
    currentTeamIndex: 0,
    currentExplainerPlayerId: room.hostId,
    usedCardIdsInGame: [],
    last3RoundCardIds: [],
    phase: 'round',
    roundStartedAt: Date.now(),
  }
  const updatedRoom: Room = {
    ...room,
    status: 'inGame',
    teamsGameState: state,
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
    room: updatedRoom,
  }
}

export function startTeamsRound(
  roomsById: RoomsById,
  roomId: string,
): { roomsById: RoomsById; room: Room | null } {
  const room = roomsById[roomId]
  const state = room?.teamsGameState
  if (!room || room.settings.mode !== 'teams' || !state) {
    return { roomsById, room: null }
  }
  // Для следующих раундов переиспользуем тот же набор карточек, чтобы не исчерпывать колоду.
  const roundCardIds = state.roundCardIds
  const nextRound = state.currentRound + 1
  const nextTeamIndex = (state.currentTeamIndex + 1) % room.teams.length
  const last3 = [...state.last3RoundCardIds, state.roundCardIds].slice(-3)
  const newState: TeamsGameState = {
    ...state,
    currentRound: nextRound,
    currentTeamIndex: nextTeamIndex,
    roundCardIds,
    currentCardIndexInRound: 0,
    phase: roundCardIds.length > 0 ? 'round' : 'roundResults',
    last3RoundCardIds: last3,
    roundStartedAt: roundCardIds.length > 0 ? Date.now() : undefined,
  }
  const updatedRoom: Room = {
    ...room,
    teamsGameState: newState,
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
    room: updatedRoom,
  }
}

export function processTeamsCardAction(
  roomsById: RoomsById,
  roomId: string,
  action: TeamsCardAction,
  endRound?: boolean,
): { roomsById: RoomsById } {
  const room = roomsById[roomId]
  const state = room?.teamsGameState
  if (!room || room.settings.mode !== 'teams' || !state || state.phase !== 'round') {
    return { roomsById }
  }
  const { roundCardIds, currentCardIndexInRound } = state
  if (currentCardIndexInRound >= roundCardIds.length) return { roomsById }
  const cardId = roundCardIds[currentCardIndexInRound]
  const card = getCardById(cardId)
  if (!card) return { roomsById }

  const roundCardActions = { ...(state.roundCardActions ?? {}), [cardId]: action }
  const usedInGame = [...state.usedCardIdsInGame, cardId]
  const nextIndex = currentCardIndexInRound + 1
  const roundOver = !!endRound || nextIndex >= roundCardIds.length
  const newState: TeamsGameState = {
    ...state,
    roundCardActions,
    usedCardIdsInGame: usedInGame,
    currentCardIndexInRound: nextIndex,
    phase: roundOver ? 'wordConfirmation' : 'round',
  }
  const updatedRoom: Room = {
    ...room,
    teamsGameState: newState,
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
  }
}

/** Apply confirmed word results and move to round results. countByCardId: cardId -> include in score. */
export function applyRoundWordConfirmation(
  roomsById: RoomsById,
  roomId: string,
  countByCardId: Record<string, boolean>,
): { roomsById: RoomsById; room: Room | null } {
  const room = roomsById[roomId]
  const state = room?.teamsGameState
  if (!room || room.settings.mode !== 'teams' || !state || state.phase !== 'wordConfirmation') {
    return { roomsById, room: null }
  }
  const { roundCardIds, currentTeamIndex, roundCardActions = {} } = state
  let totalDelta = 0
  const shownIds = roundCardIds.filter((id) => roundCardActions[id] != null)
  for (const cardId of shownIds) {
    if (countByCardId[cardId]) {
      const action = roundCardActions[cardId] ?? 'skip'
      if (action === 'accept') {
        const isGestures = room.settings.gameSubModes?.gestures
        totalDelta += isGestures ? 0.5 : 1
      } else if (action === 'fact') {
        totalDelta += 0.5
      }
    } else {
      if (room.settings.skipPenalty) totalDelta -= 1
    }
  }
  const teams = room.teams.map((t, i) => {
    if (i !== currentTeamIndex) return t
    return { ...t, score: Math.max(0, t.score + totalDelta) }
  })
  const newState: TeamsGameState = {
    ...state,
    phase: 'roundResults',
    roundCardActions: undefined,
  }
  const updatedRoom: Room = {
    ...room,
    teams,
    teamsGameState: newState,
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
    room: updatedRoom,
  }
}

export function finishTeamsGame(roomsById: RoomsById, roomId: string): { roomsById: RoomsById } {
  const room = roomsById[roomId]
  if (!room || room.settings.mode !== 'teams') return { roomsById }
  const updatedRoom: Room = {
    ...room,
    status: 'finished',
  }
  return {
    roomsById: { ...roomsById, [roomId]: updatedRoom },
  }
}

