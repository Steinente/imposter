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
  const protectedHostId = view(passwordHost).selfId
  const protectedGuestId = view(passwordGuest).selfId
  await assert.rejects(emit(passwordGuest, 'kick-player', { playerId: protectedHostId }), /Nur der Host/)
  await emit(passwordHost, 'kick-player', { playerId: protectedGuestId })
  await wait('Spieler entfernt', () => view(passwordHost)?.players.length === 1 && !passwordGuest.socket.connected)

  const players = await Promise.all(['Ada', 'Ben', 'Cleo', 'Dario'].map(connect))
  const savedConfig = { mode: 'hidden', rounds: 3, clueRounds: 1, categories: ['Tiere'] }
  const created = await emit(players[0], 'create', { name: players[0].name, sessionToken: players[0].token, config: savedConfig })
  for (const client of players.slice(1)) await emit(client, 'join', { code: created.code, name: client.name, sessionToken: client.token })
  assert.deepEqual(view(players[0]).config, savedConfig, 'gespeicherte Einstellungen werden beim Erstellen übernommen')
  await emit(players[0], 'start')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await wait('reveal', () => players.every((client) => view(client)?.phase === 'reveal'))

  const reveals = players.map((client) => view(client).round.privateReveal)
  const ids = players.map((client) => view(client).selfId)
  const firstSpeakerOrder = view(players[0]).round.speakerOrderIds
  assert.deepEqual(new Set(firstSpeakerOrder), new Set(ids), 'Ansagereihenfolge enthält alle Spieler')
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

  const firstVotes = [ids[1], ids[0], ids[1], ids[0]]
  await emit(players[0], 'vote', { targetId: firstVotes[0] })
  await wait('offene Stimmen sichtbar', () => players.every((client) => view(client)?.round.votedCount === 1))
  for (const client of players) {
    const voters = view(client).players.filter((player) => player.hasVoted).map((player) => player.id)
    assert.deepEqual(voters, [ids[0]], 'sichtbar ist nur, wer bereits abgestimmt hat')
  }
  for (let index = 1; index < players.length; index++) await emit(players[index], 'vote', { targetId: firstVotes[index] })
  await wait('runoff', () => players.every((client) => view(client)?.phase === 'runoff'))
  for (const client of players) assert.equal(view(client).round.voteCounts, null, 'Zwischenstand bleibt geheim')

  const runoffVotes = [ids[1], ids[0], ids[0], ids[1]]
  for (let index = 0; index < players.length; index++) await emit(players[index], 'vote', { targetId: runoffVotes[index] })
  await wait('result', () => players.every((client) => view(client)?.phase === 'result'))
  const result = view(players[0])
  assert.equal(result.round.selectedId, null, 'zweiter Gleichstand bleibt ohne Entscheidung')
  assert.equal(result.round.winner, 'imposter')
  assert.ok(result.round.imposterId && result.round.mainWord && result.round.imposterWord)
  await emit(players[0], 'next-round')
  await wait('nächste Runde', () => players.every((client) => view(client)?.phase === 'reveal' && view(client)?.round.number === 2))
  const nextSpeakerOrder = view(players[0]).round.speakerOrderIds
  assert.deepEqual(new Set(nextSpeakerOrder), new Set(ids), 'neue Ansagereihenfolge enthält alle Spieler')
  assert.notDeepEqual(nextSpeakerOrder, firstSpeakerOrder, 'Ansagereihenfolge ändert sich pro Runde')

  const dropPlayers = await Promise.all(['DropAda', 'DropBen', 'DropCleo', 'DropDario'].map(connect))
  const dropLobby = await emit(dropPlayers[0], 'create', { name: dropPlayers[0].name, sessionToken: dropPlayers[0].token, config: savedConfig })
  for (const client of dropPlayers.slice(1)) await emit(client, 'join', { code: dropLobby.code, name: client.name, sessionToken: client.token })
  await emit(dropPlayers[0], 'start')
  await wait('Disconnect-Test Aufdeckung', () => dropPlayers.every((client) => view(client)?.phase === 'reveal'))
  for (const client of dropPlayers) await emit(client, 'confirm-reveal')
  await wait('Disconnect-Test Hinweisphase', () => dropPlayers.every((client) => view(client)?.phase === 'clue'))
  await emit(dropPlayers[0], 'advance-clue')
  await wait('Disconnect-Test Abstimmung', () => dropPlayers.every((client) => view(client)?.phase === 'vote'))
  const dropIds = dropPlayers.map((client) => view(client).selfId)
  await emit(dropPlayers[0], 'vote', { targetId: dropIds[1] })
  dropPlayers[0].socket.close()
  await wait('Stimme des getrennten Spielers entfernt', () => dropPlayers.slice(1).every((client) => view(client)?.round.votedCount === 0))
  await emit(dropPlayers[1], 'vote', { targetId: dropIds[2] })
  await emit(dropPlayers[2], 'vote', { targetId: dropIds[1] })
  await emit(dropPlayers[3], 'vote', { targetId: dropIds[1] })
  await wait('Abstimmung nach Disconnect aufgelöst', () => dropPlayers.slice(1).every((client) => view(client)?.phase === 'result'))

  const classicPlayers = await Promise.all(['ClassicAda', 'ClassicBen', 'ClassicCleo'].map(connect))
  const classicConfig = { mode: 'classic', rounds: 3, clueRounds: 1, categories: ['Tiere'] }
  const classicLobby = await emit(classicPlayers[0], 'create', { name: classicPlayers[0].name, sessionToken: classicPlayers[0].token, config: classicConfig })
  for (const client of classicPlayers.slice(1)) await emit(client, 'join', { code: classicLobby.code, name: client.name, sessionToken: client.token })
  await emit(classicPlayers[0], 'start')
  await wait('Classic Aufdeckung', () => classicPlayers.every((client) => view(client)?.phase === 'reveal'))
  const imposter = classicPlayers.find((client) => view(client).round.privateReveal.kind === 'imposter')
  const crew = classicPlayers.filter((client) => client !== imposter)
  const mainWord = view(crew[0]).round.privateReveal.word
  for (const client of classicPlayers) await emit(client, 'confirm-reveal')
  await wait('Classic Hinweisphase', () => classicPlayers.every((client) => view(client)?.phase === 'clue'))
  await emit(classicPlayers[0], 'advance-clue')
  await wait('Classic Abstimmung', () => classicPlayers.every((client) => view(client)?.phase === 'vote'))
  const imposterId = view(imposter).selfId
  await emit(imposter, 'vote', { targetId: view(crew[0]).selfId })
  for (const client of crew) await emit(client, 'vote', { targetId: imposterId })
  await wait('Classic Freitextphase', () => classicPlayers.every((client) => view(client)?.phase === 'guess'))
  assert.equal(view(imposter).round.canGuess, true)
  await emit(imposter, 'guess', { word: mainWord.toLocaleLowerCase('de-DE') })
  await wait('Classic Ergebnis', () => classicPlayers.every((client) => view(client)?.phase === 'result'))
  console.log('Integration erfolgreich: Kickfunktion, Einstellungen, Ansagereihenfolge, Abstimmungen inklusive Disconnect, Stichwahl und Classic-Freitext geprüft.')
} finally {
  clients.forEach((socket) => socket.close())
}
