import { wordPairs, type WordPair } from './words.js'
import type { ClientView, GameConfig, Lobby, Player, RoundState } from './types.js'

export const DEFAULT_CONFIG: GameConfig = { mode: 'classic', rounds: 3, clueRounds: 1, categories: ['Allgemein'] }
export const POINTS = { crewWin: 1, imposterWin: 2 } as const

const randomItem = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!

export function choosePair(config: GameConfig, used: Set<string>): WordPair {
  const eligible = wordPairs.filter((pair) => config.categories.includes(pair.category))
  if (!eligible.length) throw new Error('Für diese Kategorien sind keine Wörter vorhanden.')
  let available = eligible.filter((pair) => !used.has(`${pair.main}|${pair.alternate}`))
  if (!available.length) {
    eligible.forEach((pair) => used.delete(`${pair.main}|${pair.alternate}`))
    available = eligible
  }
  const pair = randomItem(available)
  used.add(`${pair.main}|${pair.alternate}`)
  return pair
}

export function chooseImposter(players: Player[], previous: string | null): Player {
  const connected = players.filter((player) => player.connected)
  const leastUsed = Math.min(...connected.map((player) => player.imposterRounds))
  let candidates = connected.filter((player) => player.imposterRounds === leastUsed && player.id !== previous)
  if (!candidates.length) candidates = connected.filter((player) => player.id !== previous)
  if (!candidates.length) candidates = connected
  return randomItem(candidates)
}

export function createRound(lobby: Lobby): RoundState {
  const imposter = chooseImposter(lobby.players, lobby.lastImposterId)
  const pair = choosePair(lobby.config, lobby.usedPairs)
  const starters = lobby.players.filter((player) => player.connected && player.id !== lobby.round?.starterId)
  const starter = randomItem(starters.length ? starters : lobby.players.filter((player) => player.connected))
  imposter.imposterRounds += 1
  lobby.lastImposterId = imposter.id
  return {
    number: (lobby.round?.number ?? 0) + 1, imposterId: imposter.id,
    mainWord: pair.main, imposterWord: pair.alternate, category: pair.category,
    starterId: starter.id, clueRound: 1, confirmed: new Set(), votes: new Map(),
    runoffCandidates: [], runoffUsed: false, selectedId: null, voteCounts: {}, winner: null, guessCorrect: null,
  }
}

export function tally(round: RoundState, playerIds: string[]): { tied: string[]; counts: Record<string, number> } {
  const counts = Object.fromEntries(playerIds.map((id) => [id, 0]))
  for (const target of round.votes.values()) counts[target] = (counts[target] ?? 0) + 1
  const max = Math.max(...Object.values(counts))
  return { tied: Object.keys(counts).filter((id) => counts[id] === max), counts }
}

export function applyScore(lobby: Lobby, winner: 'crew' | 'imposter'): void {
  const round = lobby.round!
  round.winner = winner
  if (winner === 'imposter') {
    const imposter = lobby.players.find((player) => player.id === round.imposterId)!
    imposter.score += POINTS.imposterWin
    imposter.wins += 1
  } else {
    for (const player of lobby.players.filter((player) => player.id !== round.imposterId)) {
      player.score += POINTS.crewWin
      player.wins += 1
    }
  }
}

export function buildView(lobby: Lobby, self: Player, hasPassword = false): ClientView {
  const round = lobby.round
  const resolved = lobby.phase === 'result' || lobby.phase === 'finished'
  let privateReveal: ClientView['round'] extends infer _ ? { kind: 'word' | 'imposter'; word?: string } | null : never = null
  if (round) {
    if (lobby.config.mode === 'classic' && self.id === round.imposterId) privateReveal = { kind: 'imposter' }
    else privateReveal = { kind: 'word', word: self.id === round.imposterId ? round.imposterWord : round.mainWord }
  }
  const voting = lobby.phase === 'vote' || lobby.phase === 'runoff'
  const eligible = lobby.phase === 'runoff' ? round?.runoffCandidates ?? [] : lobby.players.filter((p) => p.connected).map((p) => p.id)
  return {
    code: lobby.code, hasPassword, selfId: self.id, phase: lobby.phase, isHost: self.id === lobby.hostId,
    config: lobby.config,
    players: lobby.players.map((player) => ({
      id: player.id, name: player.name, connected: player.connected, score: player.score,
      isHost: player.id === lobby.hostId, hasConfirmed: round?.confirmed.has(player.id) ?? false,
      hasVoted: round?.votes.has(player.id) ?? false,
    })),
    round: round ? {
      number: round.number, clueRound: round.clueRound, starterId: round.starterId,
      confirmedCount: round.confirmed.size, votedCount: round.votes.size,
      allowedCandidateIds: voting ? eligible.filter((id) => id !== self.id) : [], privateReveal,
      selectedId: resolved ? round.selectedId : null, voteCounts: resolved ? round.voteCounts : null,
      imposterId: resolved ? round.imposterId : null, mainWord: resolved ? round.mainWord : null,
      imposterWord: resolved && lobby.config.mode === 'hidden' ? round.imposterWord : null,
      winner: resolved ? round.winner : null,
      guessOptions: lobby.phase === 'guess' && self.id === round.imposterId
        ? shuffle([round.mainWord, ...shuffle(wordPairs.filter((p) => p.category === round.category && p.main !== round.mainWord).map((p) => p.main)).slice(0, 5)])
        : [],
    } : null,
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}
