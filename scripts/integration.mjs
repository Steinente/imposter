import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { io } from 'socket.io-client'

const url = process.env.IMPOSTER_URL || 'http://localhost:3000'
const clients = []
const latest = new Map()
const lobbyLists = new Map()

function connect(name) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { forceNew: true, reconnection: false })
    clients.push(socket)
    socket.on('state', (state) => latest.set(socket, state))
    socket.on('lobby-list', (list) => lobbyLists.set(socket, list))
    socket.on('connect_error', reject)
    socket.on('connect', () => resolve({ socket, name, token: crypto.randomUUID() }))
  })
}

function emit(client, event, payload = {}) {
  return new Promise((resolve, reject) => {
    client.socket.emit(event, payload, (result) => {
      if (result?.ok) resolve(result)
      else reject(new Error(result?.error || event))
    })
  })
}

const wait = (label, predicate, timeout = 3000) => new Promise((resolve, reject) => {
  const started = Date.now()
  const timer = setInterval(() => {
    if (predicate()) { clearInterval(timer); resolve() }
    else if (Date.now() - started > timeout) { clearInterval(timer); reject(new Error(`Zeitüberschreitung: ${label}`)) }
  }, 10)
})
const view = (client) => latest.get(client.socket)

try {
  const [passwordHost, passwordGuest] = await Promise.all(['LockHost', 'LockGuest'].map(connect))
  const protectedLobby = await emit(passwordHost, 'create', { name: passwordHost.name, password: 'richtig geheim', sessionToken: passwordHost.token })
  await wait('geschützte Lobby', () => view(passwordHost)?.hasPassword === true)
  const summary = lobbyLists.get(passwordGuest.socket)?.find((lobby) => lobby.code === protectedLobby.code)
  assert.equal(summary?.hasPassword, true)
  assert.equal(JSON.stringify(summary).includes('richtig geheim'), false, 'Passwort bleibt aus der Lobbyliste')
  await assert.rejects(
    emit(passwordGuest, 'join', { code: protectedLobby.code, name: passwordGuest.name, password: 'falsch', sessionToken: passwordGuest.token }),
    /Passwort/,
  )
  await emit(passwordGuest, 'join', { code: protectedLobby.code, name: passwordGuest.name, password: 'richtig geheim', sessionToken: passwordGuest.token })
  assert.equal(view(passwordGuest).hasPassword, true)
  assert.equal(JSON.stringify(view(passwordGuest)).includes('richtig geheim'), false, 'Passwort bleibt aus dem Client-Zustand')

  const players = await Promise.all(['Ada', 'Ben', 'Cleo', 'Dario'].map(connect))
  const created = await emit(players[0], 'create', { name: players[0].name, sessionToken: players[0].token })
  for (const client of players.slice(1)) await emit(client, 'join', { code: created.code, name: client.name, sessionToken: client.token })
  await emit(players[0], 'update-config', { mode: 'hidden', rounds: 3, clueRounds: 1, categories: ['Tiere'] })
  await emit(players[0], 'start')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await wait('reveal', () => players.every((client) => view(client)?.phase === 'reveal'))

  const reveals = players.map((client) => view(client).round.privateReveal)
  assert.ok(reveals.every((reveal) => reveal.kind === 'word'), 'Hidden verrät keine Rolle')
  assert.equal(new Set(reveals.map((reveal) => reveal.word)).size, 2, 'genau zwei Wörter werden verteilt')
  for (const client of players) {
    const state = view(client)
    assert.equal(state.round.imposterId, null)
    assert.equal(state.round.mainWord, null)
    assert.equal(state.round.voteCounts, null)
    await emit(client, 'confirm-reveal')
  }
  await wait('clue', () => players.every((client) => view(client)?.phase === 'clue'))
  await emit(players[0], 'advance-clue')
  await wait('vote', () => players.every((client) => view(client)?.phase === 'vote'))

  const ids = players.map((client) => view(client).selfId)
  const firstVotes = [ids[1], ids[0], ids[1], ids[0]]
  for (let index = 0; index < players.length; index++) await emit(players[index], 'vote', { targetId: firstVotes[index] })
  await wait('runoff', () => players.every((client) => view(client)?.phase === 'runoff'))
  for (const client of players) assert.equal(view(client).round.voteCounts, null, 'Zwischenstand bleibt geheim')

  const runoffVotes = [ids[1], ids[0], ids[0], ids[1]]
  for (let index = 0; index < players.length; index++) await emit(players[index], 'vote', { targetId: runoffVotes[index] })
  await wait('result', () => players.every((client) => view(client)?.phase === 'result'))
  const result = view(players[0])
  assert.equal(result.round.selectedId, null, 'zweiter Gleichstand bleibt ohne Entscheidung')
  assert.equal(result.round.winner, 'imposter')
  assert.ok(result.round.imposterId && result.round.mainWord && result.round.imposterWord)
  console.log('Integration erfolgreich: Passwortschutz, Hidden-Geheimhaltung, synchroner Ablauf, Stichwahl und Ergebnis geprüft.')
} finally {
  clients.forEach((socket) => socket.close())
}
