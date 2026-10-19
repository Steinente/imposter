import { describe, expect, it } from 'vitest'
import { buildView, chooseImposter, choosePair, normalizeGuess, tally } from './game.js'
import type { Lobby, Player, RoundState } from './types.js'

const players: Player[] = ['a', 'b', 'c'].map((id, index) => ({ id, name: id, sessionToken: id, connected: true, score: 0, imposterRounds: index ? 0 : 1, wins: 0 }))

describe('game rules', () => {
  it('avoids the previous imposter and favors the least used players', () => {
    expect(chooseImposter(players, 'b').id).toBe('c')
  })
  it('does not repeat a pair before the category is exhausted', () => {
    const used = new Set<string>()
    const first = choosePair({ mode: 'hidden', rounds: 3, clueRounds: 1, categories: ['Tiere'] }, used)
    const second = choosePair({ mode: 'hidden', rounds: 3, clueRounds: 1, categories: ['Tiere'] }, used)
    expect(first.main).not.toBe(second.main)
  })
  it('detects a tie deterministically', () => {
    const round = { votes: new Map([['a', 'b'], ['b', 'a']]) } as RoundState
    expect(tally(round, ['a', 'b', 'c']).tied).toEqual(['a', 'b'])
  })

  it('keeps the personal word or Classic role available after reveal', () => {
    const round = {
      number: 1, imposterId: 'a', mainWord: 'Katze', imposterWord: 'Hund', category: 'Tiere',
      starterId: 'b', clueRound: 1, confirmed: new Set(), votes: new Map(), runoffCandidates: [],
      runoffUsed: false, selectedId: null, voteCounts: {}, winner: null, guessCorrect: null,
    } satisfies RoundState
    const lobby = {
      code: 'ABCDE', hostId: 'a', players, config: { mode: 'classic', rounds: 3, clueRounds: 1, categories: ['Tiere'] },
      phase: 'vote', round, usedPairs: new Set(), lastImposterId: 'a',
    } satisfies Lobby
    expect(buildView(lobby, players[0]!).round?.privateReveal).toEqual({ kind: 'imposter' })
    expect(buildView(lobby, players[1]!).round?.privateReveal).toEqual({ kind: 'word', word: 'Katze' })
  })

  it('compares free-text guesses without case or surrounding whitespace', () => {
    expect(normalizeGuess('  KATZE  ')).toBe(normalizeGuess('Katze'))
  })

  it('only lets the imposter submit a guess during the guess phase', () => {
    const round = {
      number: 1, imposterId: 'a', mainWord: 'Katze', imposterWord: 'Hund', category: 'Tiere',
      starterId: 'b', clueRound: 1, confirmed: new Set(), votes: new Map(), runoffCandidates: [],
      runoffUsed: false, selectedId: 'a', voteCounts: {}, winner: null, guessCorrect: null,
    } satisfies RoundState
    const lobby = {
      code: 'ABCDE', hostId: 'a', players, config: { mode: 'classic', rounds: 3, clueRounds: 1, categories: ['Tiere'] },
      phase: 'guess', round, usedPairs: new Set(), lastImposterId: 'a',
    } satisfies Lobby
    expect(buildView(lobby, players[0]!).round?.canGuess).toBe(true)
    expect(buildView(lobby, players[1]!).round?.canGuess).toBe(false)
  })
})
