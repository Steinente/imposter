export const categories = [
  'Allgemein', 'Tiere', 'Essen & Trinken', 'Berufe', 'Orte',
  'Gegenstände', 'Filme & Serien', 'Spiele', 'Sport', 'Natur',
] as const

export type Category = (typeof categories)[number]
export type GameMode = 'classic' | 'hidden'
export type Phase = 'lobby' | 'reveal' | 'clue' | 'vote' | 'runoff' | 'guess' | 'result' | 'finished'

export interface GameConfig {
  mode: GameMode
  rounds: 3 | 5 | 7 | 10
  clueRounds: 1 | 2 | 3
  categories: Category[]
}

export interface Player {
  id: string
  name: string
  sessionToken: string
  connected: boolean
  score: number
  imposterRounds: number
  wins: number
}

export interface RoundState {
  number: number
  imposterId: string
  mainWord: string
  imposterWord: string
  category: Category
  starterId: string
  clueRound: number
  confirmed: Set<string>
  votes: Map<string, string>
  runoffCandidates: string[]
  runoffUsed: boolean
  selectedId: string | null
  voteCounts: Record<string, number>
  winner: 'crew' | 'imposter' | null
  guessCorrect: boolean | null
}

export interface Lobby {
  code: string
  hostId: string
  players: Player[]
  config: GameConfig
  phase: Phase
  round: RoundState | null
  usedPairs: Set<string>
  lastImposterId: string | null
}

export interface PublicPlayer {
  id: string
  name: string
  connected: boolean
  score: number
  isHost: boolean
  hasConfirmed: boolean
  hasVoted: boolean
}

export interface ClientView {
  code: string
  hasPassword: boolean
  selfId: string
  phase: Phase
  isHost: boolean
  players: PublicPlayer[]
  config: GameConfig
  round: null | {
    number: number
    clueRound: number
    starterId: string
    confirmedCount: number
    votedCount: number
    allowedCandidateIds: string[]
    privateReveal: null | { kind: 'word' | 'imposter'; word?: string }
    selectedId: string | null
    voteCounts: Record<string, number> | null
    imposterId: string | null
    mainWord: string | null
    imposterWord: string | null
    winner: 'crew' | 'imposter' | null
    guessOptions: string[]
  }
}
