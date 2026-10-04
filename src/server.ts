import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { z } from 'zod'
import { applyScore, buildView, createRound, DEFAULT_CONFIG, tally } from './game.js'
import { categories, type GameConfig, type Lobby, type Player } from './types.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)
const lobbies = new Map<string, Lobby>()
const lobbyPasswordHashes = new Map<string, string>()
const sessions = new Map<string, { code: string; playerId: string }>()
const sockets = new Map<string, string>()
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public')
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
app.use(express.static(publicDir))
app.get('/join/:code', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')))
app.get('/lobby/:code', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')))
app.get('/game/:code', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')))

const identitySchema = z.object({ name: z.string().trim().min(1).max(28), sessionToken: z.string().min(16).max(100) })
const passwordSchema = z.string().trim().max(64).optional()
const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}$/)
const configSchema = z.object({
  mode: z.enum(['classic', 'hidden']), rounds: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]),
  clueRounds: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  categories: z.array(z.enum(categories)).min(1).max(categories.length),
})

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do { code = Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('') } while (lobbies.has(code))
  return code
}
const errorMessage = (error: unknown) => error instanceof z.ZodError ? error.issues[0]?.message ?? 'Ungültige Eingabe.' : error instanceof Error ? error.message : 'Unbekannter Fehler.'
const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex')
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`
}
const passwordMatches = (password: string, encoded: string) => {
  const [salt, savedHex] = encoded.split(':')
  if (!salt || !savedHex) return false
  const saved = Buffer.from(savedHex, 'hex')
  const supplied = crypto.scryptSync(password, salt, saved.length)
  return saved.length === supplied.length && crypto.timingSafeEqual(saved, supplied)
}
const reply = (ack: ((value: unknown) => void) | undefined, value: unknown) => ack?.(value)
const getContext = (socket: Socket) => {
  const token = sockets.get(socket.id)
  const session = token ? sessions.get(token) : undefined
  const lobby = session ? lobbies.get(session.code) : undefined
  const player = lobby?.players.find((item) => item.id === session?.playerId)
  if (!token || !session || !lobby || !player) throw new Error('Sitzung nicht gefunden.')
  return { token, lobby, player }
}
const hostOnly = (lobby: Lobby, player: Player) => { if (lobby.hostId !== player.id) throw new Error('Nur der Host kann diese Aktion ausführen.') }
const connectedPlayers = (lobby: Lobby) => lobby.players.filter((player) => player.connected)
const publicLobbyList = () => [...lobbies.values()]
  .filter((lobby) => lobby.phase !== 'finished' && connectedPlayers(lobby).length > 0)
  .map((lobby) => ({
    code: lobby.code,
    status: lobby.phase === 'lobby' ? 'waiting' : 'running',
    playerCount: connectedPlayers(lobby).length,
    maxPlayers: 12,
    hasPassword: lobbyPasswordHashes.has(lobby.code),
  }))
  .sort((a, b) => a.status.localeCompare(b.status) || a.code.localeCompare(b.code))
const broadcastLobbyList = () => io.emit('lobby-list', publicLobbyList())
const emitLobby = (lobby: Lobby) => {
  for (const player of lobby.players) {
    const socketIds = [...sockets.entries()].filter(([, token]) => token === player.sessionToken).map(([id]) => id)
    socketIds.forEach((id) => io.to(id).emit('state', buildView(lobby, player, lobbyPasswordHashes.has(lobby.code))))
  }
  broadcastLobbyList()
}
const enter = (socket: Socket, lobby: Lobby, player: Player) => {
  sockets.set(socket.id, player.sessionToken); sessions.set(player.sessionToken, { code: lobby.code, playerId: player.id })
  socket.join(lobby.code); player.connected = true; emitLobby(lobby)
}
const detachPreviousSession = (sessionToken: string, targetCode: string) => {
  const previousSession = sessions.get(sessionToken)
  if (!previousSession || previousSession.code === targetCode) return
  const previousLobby = lobbies.get(previousSession.code)
  if (!previousLobby) { sessions.delete(sessionToken); return }
  const previousPlayer = previousLobby.players.find((player) => player.id === previousSession.playerId)
  previousLobby.players = previousLobby.players.filter((player) => player.id !== previousSession.playerId)
  sessions.delete(sessionToken)
  if (!previousLobby.players.length) { lobbies.delete(previousLobby.code); lobbyPasswordHashes.delete(previousLobby.code); broadcastLobbyList(); return }
  if (previousPlayer?.id === previousLobby.hostId) previousLobby.hostId = previousLobby.players[0]!.id
  emitLobby(previousLobby)
}
const resolveVote = (lobby: Lobby) => {
  const round = lobby.round!
  const { tied, counts } = tally(round, connectedPlayers(lobby).map((p) => p.id))
  round.voteCounts = counts
  if (tied.length > 1 && !round.runoffUsed) {
    round.runoffUsed = true; round.runoffCandidates = tied; round.votes.clear(); lobby.phase = 'runoff'; return
  }
  round.selectedId = tied.length === 1 ? tied[0]! : null
  const caught = round.selectedId === round.imposterId
  if (lobby.config.mode === 'classic' && caught) lobby.phase = 'guess'
  else { applyScore(lobby, caught ? 'crew' : 'imposter'); lobby.phase = 'result' }
}

io.on('connection', (socket) => {
  socket.emit('lobby-list', publicLobbyList())
  socket.on('create', (raw, ack) => { try {
    const input = identitySchema.extend({ password: passwordSchema }).parse(raw); const code = generateCode()
    const player: Player = { id: crypto.randomUUID(), name: input.name, sessionToken: input.sessionToken, connected: true, score: 0, imposterRounds: 0, wins: 0 }
    const lobby: Lobby = { code, hostId: player.id, players: [player], config: structuredClone(DEFAULT_CONFIG), phase: 'lobby', round: null, usedPairs: new Set(), lastImposterId: null }
    lobbies.set(code, lobby)
    if (input.password) lobbyPasswordHashes.set(code, hashPassword(input.password))
    enter(socket, lobby, player); reply(ack, { ok: true, code })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('join', (raw, ack) => { try {
    const input = identitySchema.extend({ code: codeSchema, password: passwordSchema }).parse(raw); const lobby = lobbies.get(input.code)
    if (!lobby || lobby.phase !== 'lobby') throw new Error('Lobby nicht gefunden oder bereits gestartet.')
    const storedPassword = lobbyPasswordHashes.get(lobby.code)
    if (storedPassword && !input.password) throw new Error('Diese Lobby benötigt ein Passwort.')
    if (storedPassword && !passwordMatches(input.password!, storedPassword)) throw new Error('Das Lobby-Passwort ist ungültig.')
    if (lobby.players.length >= 12) throw new Error('Diese Lobby ist bereits voll.')
    if (lobby.players.some((p) => p.name.toLocaleLowerCase() === input.name.toLocaleLowerCase())) throw new Error('Dieser Name ist bereits vergeben.')
    detachPreviousSession(input.sessionToken, lobby.code)
    const player: Player = { id: crypto.randomUUID(), name: input.name, sessionToken: input.sessionToken, connected: true, score: 0, imposterRounds: 0, wins: 0 }
    lobby.players.push(player); enter(socket, lobby, player); reply(ack, { ok: true, code: lobby.code })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('reconnect-session', (raw, ack) => { try {
    const input = z.object({ sessionToken: z.string().min(16), code: codeSchema.optional() }).parse(raw)
    const token = input.sessionToken; const session = sessions.get(token)
    if (input.code && session?.code !== input.code) throw new Error('Keine passende aktive Sitzung gefunden.')
    const lobby = session ? lobbies.get(session.code) : undefined
    const player = lobby?.players.find((p) => p.id === session?.playerId); if (!lobby || !player) throw new Error('Keine aktive Sitzung gefunden.')
    enter(socket, lobby, player); reply(ack, { ok: true, code: lobby.code })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('update-config', (raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player); if (lobby.phase !== 'lobby') throw new Error('Das Spiel läuft bereits.')
    lobby.config = configSchema.parse(raw) as GameConfig; emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('start', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player); if (connectedPlayers(lobby).length < 3) throw new Error('Mindestens 3 verbundene Spieler werden benötigt.')
    lobby.round = createRound(lobby); lobby.phase = 'reveal'; emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('confirm-reveal', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); if (lobby.phase !== 'reveal') throw new Error('Die Aufdeckung ist bereits beendet.')
    lobby.round!.confirmed.add(player.id); if (connectedPlayers(lobby).every((p) => lobby.round!.confirmed.has(p.id))) lobby.phase = 'clue'
    emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('advance-clue', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player); if (lobby.phase !== 'clue') throw new Error('Keine Hinweisphase aktiv.')
    if (lobby.round!.clueRound < lobby.config.clueRounds) lobby.round!.clueRound += 1
    else { lobby.phase = 'vote'; lobby.round!.votes.clear() }
    emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('vote', (raw, ack) => { try {
    const { lobby, player } = getContext(socket); if (lobby.phase !== 'vote' && lobby.phase !== 'runoff') throw new Error('Keine Abstimmung aktiv.')
    const targetId = z.string().uuid().parse(raw?.targetId); if (targetId === player.id) throw new Error('Du kannst nicht für dich selbst stimmen.')
    if (lobby.round!.votes.has(player.id)) throw new Error('Deine Stimme ist bereits final abgegeben.')
    const allowed = lobby.phase === 'runoff' ? lobby.round!.runoffCandidates : connectedPlayers(lobby).map((p) => p.id)
    if (!allowed.includes(targetId)) throw new Error('Diese Person steht nicht zur Wahl.')
    lobby.round!.votes.set(player.id, targetId); if (lobby.round!.votes.size === connectedPlayers(lobby).length) resolveVote(lobby)
    emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('guess', (raw, ack) => { try {
    const { lobby, player } = getContext(socket); if (lobby.phase !== 'guess' || lobby.round!.imposterId !== player.id) throw new Error('Du darfst nicht raten.')
    const guess = z.string().min(1).max(40).parse(raw?.word); lobby.round!.guessCorrect = guess === lobby.round!.mainWord
    applyScore(lobby, lobby.round!.guessCorrect ? 'imposter' : 'crew'); lobby.phase = 'result'; emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('next-round', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player); if (lobby.phase !== 'result') throw new Error('Die Runde ist noch nicht beendet.')
    if (lobby.round!.number >= lobby.config.rounds) lobby.phase = 'finished'
    else { lobby.round = createRound(lobby); lobby.phase = 'reveal' }
    emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('back-to-lobby', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player); lobby.phase = 'lobby'; lobby.round = null; lobby.usedPairs.clear(); lobby.lastImposterId = null
    lobby.players.forEach((p) => { p.score = 0; p.imposterRounds = 0; p.wins = 0 }); emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('abort-game', (_raw, ack) => { try {
    const { lobby, player } = getContext(socket); hostOnly(lobby, player)
    if (lobby.phase === 'lobby') throw new Error('Es läuft noch kein Spiel.')
    lobby.phase = 'lobby'; lobby.round = null; lobby.usedPairs.clear(); lobby.lastImposterId = null
    lobby.players.forEach((p) => { p.score = 0; p.imposterRounds = 0; p.wins = 0 })
    emitLobby(lobby); reply(ack, { ok: true })
  } catch (error) { reply(ack, { ok: false, error: errorMessage(error) }) } })

  socket.on('leave', () => { try { const { lobby, player, token } = getContext(socket); if (lobby.phase !== 'lobby') return
    lobby.players = lobby.players.filter((p) => p.id !== player.id); sessions.delete(token); sockets.delete(socket.id)
    if (!lobby.players.length) { lobbies.delete(lobby.code); lobbyPasswordHashes.delete(lobby.code); broadcastLobbyList() } else { if (lobby.hostId === player.id) lobby.hostId = lobby.players[0]!.id; emitLobby(lobby) }
  } catch {} })

  socket.on('disconnect', () => { try { const { lobby, player } = getContext(socket); sockets.delete(socket.id)
    const stillConnected = [...sockets.values()].includes(player.sessionToken); player.connected = stillConnected
    if (!stillConnected && (lobby.phase === 'vote' || lobby.phase === 'runoff') && lobby.round!.votes.size === connectedPlayers(lobby).length) resolveVote(lobby)
    emitLobby(lobby)
  } catch {} })
})

const port = Number(process.env.PORT ?? 3000)
httpServer.listen(port, () => console.log(`Imposter läuft auf http://localhost:${port}`))
