/* global io */
const socket = io()
const app = document.querySelector('#app')
const footer = document.querySelector('#site-footer')
const toast = document.querySelector('#toast')
const CATEGORIES = ['Allgemein', 'Tiere', 'Essen & Trinken', 'Berufe', 'Orte', 'Gegenstände', 'Filme & Serien', 'Spiele', 'Sport', 'Natur']
const tokenKey = 'imposter.sessionToken'
const nameKey = 'imposter.playerName'
const languageKey = 'imposter.language'
const token = localStorage.getItem(tokenKey) || crypto.randomUUID()
localStorage.setItem(tokenKey, token)

const TEXT = {
  de: {
    language: 'Sprache', subtitle: 'Erstelle eine Multiplayer-Lobby oder tritt einer bei', playerName: 'Spielername',
    createLobby: 'Lobby erstellen', joinLobby: 'Lobby beitreten', lobbyCode: 'Lobby-Code', join: 'Beitreten', passwordOptional: 'Lobby-Passwort (optional)', passwordRequired: 'Lobby-Passwort (falls erforderlich)', passwordShort: 'Lobby-Passwort', passwordProtected: 'Passwortgeschützt',
    openLobbies: 'Offene Lobbys', noLobbies: 'Aktuell sind keine offenen Lobbys verfügbar.', waiting: 'Wartet', running: 'Läuft', players: 'Spieler', player: 'Spieler', you: 'du', connected: 'Verbunden', disconnected: 'Getrennt', host: 'Host',
    copyCode: 'Code kopieren', copied: 'Kopiert', copyFailed: 'Kopieren fehlgeschlagen.', shareLobby: 'Lobby teilen', shareTitle: 'Imposter-Lobby', shareText: 'Tritt meiner Imposter-Lobby {code} bei.', leaveLobby: 'Lobby verlassen', startGame: 'Spiel starten', minPlayers: 'Mindestens 3 verbundene Spieler werden benötigt.',
    settings: 'Spieleinstellungen', settingsHost: 'Du kannst die Regeln bis zum Start ändern.', settingsGuest: 'Nur der Host kann diese Regeln ändern.', mode: 'Spielmodus', rounds: 'Runden', roundsInfo: 'Legt fest, wie viele Runden insgesamt gespielt werden.', clueRounds: 'Hinweisrunden', clueRoundsInfo: 'Legt fest, wie viele Gesprächs- und Hinweisrunden vor jeder Abstimmung gespielt werden.', categories: 'Wortkategorien', categoriesInfo: 'Bestimmt, aus welchen Kategorien die Wörter für das Spiel ausgewählt werden.', allCategories: 'Alle Kategorien',
    classicInfo: 'Der Imposter erhält kein Wort und weiß, dass er der Imposter ist.', hiddenInfo: 'Der Imposter erhält ein anderes Wort. Niemand weiß, wer der Imposter ist – auch der Imposter selbst nicht.',
    abort: 'Spiel abbrechen', lobby: 'Lobby', points: 'P', roundOf: 'Runde {current} von {total}',
    hiddenSafely: 'Sicher verborgen', hiddenText: 'Deine Information ist nicht mehr sichtbar.', yourRole: 'Deine Rolle', noWord: 'Du hast kein Wort. Höre aufmerksam zu und bleibe unentdeckt.', yourWord: 'Dein Wort', rememberWord: 'Präge es dir ein und beschreibe es später, ohne es zu nennen.',
    secretInfo: 'Geheime Information', lookPrivately: 'Schau diskret auf deinen Bildschirm.', confirmedWaiting: 'Bestätigt – warte auf die anderen', understood: 'Gesehen und verstanden', ready: 'Bereit', countOf: '{current} von {total}',
    cluePhase: 'Hinweisphase {current} von {total}', describeWord: 'Beschreibt euer Wort, ohne es direkt zu nennen.', starter: 'Startperson', begins: '{name} beginnt', talkTogether: 'Spielt die Gesprächsrunde gemeinsam am Tisch.', nextClue: 'Nächste Hinweisrunde', startVote: 'Abstimmung starten', hostContinues: 'Der Host startet den nächsten Abschnitt.',
    runoff: 'Stichwahl', whoImposter: 'Wer ist der Imposter?', runoffHint: 'Nur die meistgewählten Personen stehen erneut zur Wahl.', voteFinalHint: 'Deine Stimme ist nach dem Absenden final.', voted: 'Stimme abgegeben', submitVote: 'Stimme final abgeben', votesCast: 'Abgestimmt', votesSecret: 'Die Auswahl der anderen bleibt bis zur Auflösung geheim.',
    caught: 'Der Imposter wurde gefunden', guessHidden: 'Das eigentliche Wort bleibt für einen letzten Versuch noch geheim.', lastTry: 'Dein letzter Versuch', whichWord: 'Welches Wort hatten die anderen?', imposterGuessing: 'Der Imposter rät jetzt das Wort.', resultSoon: 'Gleich wird das Ergebnis aufgedeckt.',
    gameFinished: 'Spiel beendet', roundFinished: 'Runde {round} beendet', finalScoreHint: 'Das ist der Endstand.', revealedHint: 'Die Rollen und Wörter sind jetzt aufgedeckt.', imposterWas: 'Der Imposter war', normalWord: 'Normales Wort', imposterWord: 'Imposter-Wort', winner: 'Gewinner', crew: 'Normale Spieler', decisive: '{name} erhielt die entscheidende Mehrheit.', noDecision: 'Auch die Stichwahl endete ohne eindeutige Entscheidung.', finalScore: 'Endstand', votesAndScore: 'Stimmen & Punktestand', votes: 'Stimme(n)', backLobby: 'Zurück zur Lobby', showFinal: 'Endstand anzeigen', nextRound: 'Nächste Runde', hostMovesOn: 'Der Host fährt fort.',
    nameRequired: 'Bitte gib deinen Namen ein.', passwordMissing: 'Diese Lobby benötigt ein Passwort.', actionFailed: 'Aktion fehlgeschlagen.', reconnecting: 'Verbindung unterbrochen – Wiederverbindung läuft …', loading: 'Lädt', back: 'Zurück', joinThis: 'Dieser Lobby beitreten', lobbyNotFoundRedirect: 'Lobby {code} wurde nicht gefunden. Du wurdest zur Startseite zurückgeleitet.', runningJoinBlocked: 'Dieses Spiel läuft bereits.', gameHub: 'Game Hub', imprint: 'Impressum', privacy: 'Datenschutz', legal: 'Rechtliche Hinweise', donationButton: 'Spendenhinweis öffnen', donationLink: 'Per PayPal spenden', donationText: 'In dieser Seite steckt viel Zeit. Wenn du die Arbeit unterstützen möchtest, kannst du hier gern eine kleine Spende dalassen.',
  },
  en: {
    language: 'Language', subtitle: 'Create or join a multiplayer lobby', playerName: 'Player name',
    createLobby: 'Create lobby', joinLobby: 'Join lobby', lobbyCode: 'Lobby code', join: 'Join', passwordOptional: 'Lobby password (optional)', passwordRequired: 'Lobby password (if required)', passwordShort: 'Lobby password', passwordProtected: 'Password protected',
    openLobbies: 'Open lobbies', noLobbies: 'No open lobbies available right now.', waiting: 'Waiting', running: 'In progress', players: 'Players', player: 'Player', you: 'you', connected: 'Connected', disconnected: 'Disconnected', host: 'Host',
    copyCode: 'Copy code', copied: 'Copied', copyFailed: 'Copy failed.', shareLobby: 'Share lobby', shareTitle: 'Imposter lobby', shareText: 'Join my Imposter lobby {code}.', leaveLobby: 'Leave lobby', startGame: 'Start game', minPlayers: 'At least 3 connected players are required.',
    settings: 'Game settings', settingsHost: 'You can change the rules until the game starts.', settingsGuest: 'Only the host can change these rules.', mode: 'Game mode', rounds: 'Rounds', roundsInfo: 'Sets how many rounds will be played in total.', clueRounds: 'Clue rounds', clueRoundsInfo: 'Sets how many conversation and clue rounds take place before each vote.', categories: 'Word categories', categoriesInfo: 'Determines which categories the words for the game are selected from.', allCategories: 'All categories',
    classicInfo: 'The Imposter receives no word and knows that they are the Imposter.', hiddenInfo: 'The Imposter receives a different word. Nobody knows who the Imposter is – not even the Imposter.',
    abort: 'Abort game', lobby: 'Lobby', points: 'pts', roundOf: 'Round {current} of {total}',
    hiddenSafely: 'Safely hidden', hiddenText: 'Your information is no longer visible.', yourRole: 'Your role', noWord: 'You received no word. Listen carefully and stay undetected.', yourWord: 'Your word', rememberWord: 'Remember it and describe it later without saying it.',
    secretInfo: 'Secret information', lookPrivately: 'Look at your screen discreetly.', confirmedWaiting: 'Confirmed – waiting for the others', understood: 'Seen and understood', ready: 'Ready', countOf: '{current} of {total}',
    cluePhase: 'Clue phase {current} of {total}', describeWord: 'Describe your word without saying it directly.', starter: 'Starting player', begins: '{name} starts', talkTogether: 'Play the conversation round together at the table.', nextClue: 'Next clue round', startVote: 'Start voting', hostContinues: 'The host starts the next section.',
    runoff: 'Runoff vote', whoImposter: 'Who is the Imposter?', runoffHint: 'Only the players with the most votes can be selected.', voteFinalHint: 'Your vote is final after submitting.', voted: 'Vote submitted', submitVote: 'Submit final vote', votesCast: 'Votes cast', votesSecret: 'Other players’ choices remain secret until the result.',
    caught: 'The Imposter was found', guessHidden: 'The actual word stays hidden for one final attempt.', lastTry: 'Your final attempt', whichWord: 'Which word did the others have?', imposterGuessing: 'The Imposter is guessing the word now.', resultSoon: 'The result will be revealed shortly.',
    gameFinished: 'Game over', roundFinished: 'Round {round} finished', finalScoreHint: 'This is the final score.', revealedHint: 'Roles and words have now been revealed.', imposterWas: 'The Imposter was', normalWord: 'Normal word', imposterWord: 'Imposter word', winner: 'Winner', crew: 'Regular players', decisive: '{name} received the decisive majority.', noDecision: 'The runoff vote also ended without a clear decision.', finalScore: 'Final score', votesAndScore: 'Votes & score', votes: 'vote(s)', backLobby: 'Back to lobby', showFinal: 'Show final score', nextRound: 'Next round', hostMovesOn: 'The host continues.',
    nameRequired: 'Please enter your name.', passwordMissing: 'This lobby requires a password.', actionFailed: 'Action failed.', reconnecting: 'Connection lost – reconnecting …', loading: 'Loading', back: 'Back', joinThis: 'Join this lobby', lobbyNotFoundRedirect: 'Lobby {code} was not found. You have been redirected to the home page.', runningJoinBlocked: 'This game is already in progress.', gameHub: 'Game Hub', imprint: 'Imprint', privacy: 'Privacy', legal: 'Legal information', donationButton: 'Open donation link', donationLink: 'Donate via PayPal', donationText: 'This project took a lot of time to build. If you want to support that work, you can leave a small donation here.',
  },
}
const CATEGORY_TEXT = {
  Allgemein: ['Allgemein', 'General'], Tiere: ['Tiere', 'Animals'], 'Essen & Trinken': ['Essen & Trinken', 'Food & Drink'], Berufe: ['Berufe', 'Professions'], Orte: ['Orte', 'Places'], Gegenstände: ['Gegenstände', 'Objects'], 'Filme & Serien': ['Filme & Serien', 'Movies & TV'], Spiele: ['Spiele', 'Games'], Sport: ['Sport', 'Sports'], Natur: ['Natur', 'Nature'],
}

let language = localStorage.getItem(languageKey) || (navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en')
let state = null
let selectedVote = null
let lobbyList = []
let lobbyListLoaded = false
let draftCode = ''
let uiError = ''
let donationOpen = false
let routeReconnectPending = /^\/(lobby|game)\/[A-Z0-9]{5}\/?$/i.test(location.pathname)

const t = (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), TEXT[language][key] || TEXT.de[key] || key)
const categoryLabel = (category) => CATEGORY_TEXT[category]?.[language === 'de' ? 0 : 1] || category
const joinCodeFromPath = () => location.pathname.match(/^\/join\/([A-Z0-9]{5})\/?$/i)?.[1]?.toUpperCase() || ''
const scopedRoute = () => {
  const match = location.pathname.match(/^\/(join|lobby|game)\/([A-Z0-9]{5})\/?$/i)
  return match ? { page: match[1].toLowerCase(), code: match[2].toUpperCase() } : null
}
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
const player = (id) => state?.players.find((item) => item.id === id)
const call = (event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve))
const notify = (message) => { toast.textContent = message; toast.hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => { toast.hidden = true }, 3500) }
const errorHtml = () => `<div class="error-box" data-error ${uiError ? '' : 'hidden'}>${escapeHtml(uiError)}</div>`
const showError = (message) => { uiError = message; const box = document.querySelector('[data-error]'); if (box) { box.textContent = message; box.hidden = false } }
const clearError = () => { uiError = ''; const box = document.querySelector('[data-error]'); if (box) { box.textContent = ''; box.hidden = true } }
const action = async (event, payload = {}) => { const result = await call(event, payload); if (!result?.ok) showError(result?.error || t('actionFailed')); else clearError(); return result }
const languageSelect = () => `<div class="home-language-box"><label class="label" for="language">${t('language')}</label><select class="select" data-language aria-label="${t('language')}"><option value="de" ${language === 'de' ? 'selected' : ''}>Deutsch</option><option value="en" ${language === 'en' ? 'selected' : ''}>English</option></select></div>`
const setView = (html) => { app.innerHTML = html; renderFooter(); bindCommon() }

function renderFooter() {
  footer.setAttribute('aria-label', t('legal'))
  footer.innerHTML = `<div class="site-legal-inner"><div class="site-legal-links"><a href="https://steinente.de/" class="site-legal-link">${t('gameHub')}</a><a href="https://steinente.de/imprint?game=imposter" class="site-legal-link">${t('imprint')}</a><a href="https://steinente.de/privacy?game=imposter" class="site-legal-link">${t('privacy')}</a></div><div class="site-donate">${donationOpen ? `<div class="site-donate-popover"><p class="site-donate-text">${t('donationText')}</p><a href="https://paypal.me/steinente" target="_blank" rel="noreferrer noopener" class="site-donate-link">${t('donationLink')}</a></div>` : ''}<button type="button" class="site-donate-trigger" data-donation aria-expanded="${donationOpen}" aria-label="${t('donationButton')}"><img src="/icons/paypal-logo.svg" alt="" aria-hidden="true" class="site-donate-logo"><span class="site-donate-trigger-text">PayPal</span></button></div></div>`
  footer.querySelector('[data-donation]')?.addEventListener('click', () => { donationOpen = !donationOpen; renderFooter() })
}

function homeName() {
  const input = document.querySelector('#name')
  const name = input?.value.trim()
  if (!name) { showError(t('nameRequired')); input?.focus(); return null }
  localStorage.setItem(nameKey, name)
  return name
}

async function joinCode(code, password = '') {
  const name = homeName()
  if (name) await action('join', { name, code: code.trim().toUpperCase(), password: password.trim() || undefined, sessionToken: token })
}

function lobbyListHtml() {
  if (!lobbyList.length) return `<div class="muted">${t('noLobbies')}</div>`
  return `<div class="lobby-list-grid">${lobbyList.map((lobby) => `<div class="panel lobby-list-item"><div class="spread"><div><strong class="code">${lobby.code}</strong><span class="muted"> · ${lobby.status === 'waiting' ? t('waiting') : t('running')}${lobby.hasPassword ? ` · 🔒 ${t('passwordProtected')}` : ''}</span><div class="muted">${t('players')}: ${lobby.playerCount}/${lobby.maxPlayers}</div></div><div class="row lobby-list-actions">${lobby.hasPassword && lobby.status === 'waiting' ? `<input class="input lobby-list-password" data-list-password="${lobby.code}" type="password" maxlength="64" autocomplete="current-password" placeholder="${t('passwordShort')}" aria-label="${t('passwordShort')}">` : ''}<button class="btn ${lobby.status === 'waiting' ? 'btn-primary' : ''}" data-list-join="${lobby.code}" data-password-protected="${lobby.hasPassword}" ${lobby.status !== 'waiting' ? 'disabled' : ''}>${lobby.status === 'waiting' ? t('join') : t('running')}</button></div></div></div>`).join('')}</div>`
}

function renderLobbyList() {
  const container = document.querySelector('#lobby-list')
  if (!container) return
  container.innerHTML = lobbyListHtml()
  document.querySelectorAll('[data-list-join]').forEach((button) => button.addEventListener('click', () => {
    const passwordInput = document.querySelector(`[data-list-password="${button.dataset.listJoin}"]`)
    const password = passwordInput?.value || ''
    if (button.dataset.passwordProtected === 'true' && !password.trim()) { showError(t('passwordMissing')); passwordInput?.focus(); return }
    joinCode(button.dataset.listJoin, password)
  }))
}

function homeView() {
  const routeCode = joinCodeFromPath()
  if (routeCode) draftCode = routeCode
  setView(`<section class="panel stack home-root">
    <div class="spread home-top-spread"><div><h1 class="title">Imposter</h1><p class="subtitle">${t('subtitle')}</p></div>${languageSelect()}</div>
    ${errorHtml()}
    <div class="panel"><label class="label" for="name">${t('playerName')}</label><input id="name" class="input" maxlength="28" autocomplete="nickname" value="${escapeHtml(localStorage.getItem(nameKey) || '')}" required></div>
    <div class="grid-2 home-actions-grid">
      <form id="create" class="panel"><h3 class="panel-title">${t('createLobby')}</h3><label class="label" for="create-password">${t('passwordOptional')}</label><input id="create-password" class="input" type="password" maxlength="64" autocomplete="new-password"><div class="row section-gap-top"><button class="btn btn-primary" data-create type="button">${t('createLobby')}</button></div></form>
      <form id="join" class="panel"><h3 class="panel-title">${t('joinLobby')}</h3><label class="label" for="code">${t('lobbyCode')}</label><input id="code" class="input code" maxlength="5" value="${escapeHtml(draftCode)}" autocapitalize="characters" required><label class="label field-gap-top" for="join-password">${t('passwordRequired')}</label><input id="join-password" class="input" type="password" maxlength="64" autocomplete="current-password"><div class="row section-gap-top"><button class="btn btn-primary" data-join type="button">${t('join')}</button></div></form>
    </div>
    <section class="panel"><h3 class="lobby-list-title">${t('openLobbies')}</h3><div id="lobby-list">${lobbyListHtml()}</div></section>
  </section>`)
  document.querySelector('#code').addEventListener('input', (event) => { draftCode = event.target.value.toUpperCase() })
  document.querySelector('[data-create]').addEventListener('click', async () => { const name = homeName(); if (name) await action('create', { name, password: document.querySelector('#create-password').value.trim() || undefined, sessionToken: token }) })
  document.querySelector('[data-join]').addEventListener('click', () => joinCode(document.querySelector('#code').value, document.querySelector('#join-password').value))
  document.querySelector('#create').addEventListener('submit', (event) => { event.preventDefault(); document.querySelector('[data-create]').click() })
  document.querySelector('#join').addEventListener('submit', (event) => { event.preventDefault(); document.querySelector('[data-join]').click() })
  renderLobbyList()
}

function joinView() {
  const code = joinCodeFromPath()
  const lobby = lobbyList.find((entry) => entry.code === code)
  setView(`<section class="panel stack join-page">
    <h2 class="panel-title">${t('lobby')} <span class="code">${escapeHtml(code)}</span></h2>
    ${errorHtml()}
    <div class="panel"><div class="muted">${lobby ? `${lobby.status === 'waiting' ? t('waiting') : t('running')} · ${t('players')}: ${lobby.playerCount}/${lobby.maxPlayers}` : `${t('loading')}…`}</div></div>
    <div><label class="label" for="join-name">${t('playerName')}</label><input id="join-name" class="input" maxlength="28" autocomplete="nickname" value="${escapeHtml(localStorage.getItem(nameKey) || '')}"></div>
    ${lobby?.hasPassword ? `<div><label class="label" for="link-password">${t('passwordRequired')}</label><input id="link-password" class="input" type="password" maxlength="64" autocomplete="current-password"></div>` : ''}
    ${lobby?.status === 'running' ? `<div class="error-box">${t('runningJoinBlocked')}</div>` : ''}
    <div class="row section-gap-top"><button class="btn btn-primary" data-link-join ${!lobby || lobby.status !== 'waiting' ? 'disabled' : ''}>${t('joinThis')}</button><button class="btn" data-back-home>${t('back')}</button></div>
  </section>`)
  document.querySelector('[data-link-join]')?.addEventListener('click', async () => {
    const input = document.querySelector('#join-name')
    const name = input.value.trim()
    if (!name) { showError(t('nameRequired')); input.focus(); return }
    const passwordInput = document.querySelector('#link-password')
    const password = passwordInput?.value.trim() || ''
    if (lobby?.hasPassword && !password) { showError(t('passwordMissing')); passwordInput.focus(); return }
    localStorage.setItem(nameKey, name)
    await action('join', { name, code, password: password || undefined, sessionToken: token })
  })
  document.querySelector('[data-back-home]').addEventListener('click', () => { uiError = ''; history.replaceState({}, '', '/'); render() })
}

function validateJoinRoute() {
  const code = joinCodeFromPath()
  if (!code || !lobbyListLoaded || state) return false
  if (lobbyList.some((lobby) => lobby.code === code)) return false
  uiError = t('lobbyNotFoundRedirect', { code })
  draftCode = ''
  history.replaceState({}, '', '/')
  homeView()
  return true
}

function shell(content, side = true) {
  const sidePanel = `<aside class="panel"><div class="spread"><h2>${t('players')}</h2><span class="status">${state.players.length}</span></div><ul class="player-list">${state.players.map((p) => `<li class="player ${p.connected ? '' : 'offline'}"><div class="player-main"><span class="avatar">${escapeHtml(p.name[0]?.toUpperCase())}</span><span class="player-name">${escapeHtml(p.name)} ${p.id === state.selfId ? `<span class="muted">(${t('you')})</span>` : ''}</span></div><span class="status">${p.isHost ? `${t('host')} · ` : ''}${p.score} ${t('points')}</span></li>`).join('')}</ul></aside>`
  const reveal = state.round?.privateReveal
  const personalInfo = reveal && state.phase !== 'reveal' ? `<section class="panel persistent-secret"><span class="persistent-secret-label">${reveal.kind === 'imposter' ? t('yourRole') : t('yourWord')}</span><strong class="persistent-secret-value">${reveal.kind === 'imposter' ? 'Imposter' : escapeHtml(reveal.word)}</strong></section>` : ''
  return `<div class="stack"><header class="panel spread"><div><div class="eyebrow">${t('lobby')} <span class="code">${state.code}</span></div><strong>Imposter</strong></div><div class="row"><button class="btn btn-ghost" data-copy>${t('copyCode')}</button><span class="status" data-copy-status hidden>${t('copied')}</span>${state.isHost && state.phase !== 'lobby' ? `<button class="btn btn-danger" data-abort>${t('abort')}</button>` : ''}<span class="status"><span class="dot"></span>${t('connected')}</span></div></header>${errorHtml()}<div class="${side ? 'grid-main' : 'stack'}"><section class="stack">${personalInfo}${content}</section>${side ? sidePanel : ''}</div></div>`
}

function lobbyView() {
  const cfg = state.config
  const categories = CATEGORIES.map((category) => `<label class="check"><input type="checkbox" name="category" value="${category}" ${cfg.categories.includes(category) ? 'checked' : ''} ${state.isHost ? '' : 'disabled'}><span>${categoryLabel(category)}</span></label>`).join('')
  const players = state.players.map((p) => `<div class="panel"><div class="spread"><strong class="player-name">${escapeHtml(p.name)} ${p.id === state.selfId ? `<span class="muted">(${t('you')})</span>` : ''}</strong><span class="status ${p.connected ? 'status-online' : 'status-offline'}">${p.connected ? t('connected') : t('disconnected')}</span></div><div class="row lobby-copy-row"><span class="muted">${p.isHost ? t('host') : t('player')}</span></div></div>`).join('')
  setView(`<div class="lobby-main-grid">
    <section class="panel"><div class="spread"><div><h2 class="lobby-heading">${t('lobby')} ${state.code}<button type="button" class="lobby-share-button" data-share aria-label="${t('shareLobby')}" title="${t('shareLobby')}"><svg aria-hidden="true" class="lobby-share-icon" viewBox="0 0 24 24"><path d="M8.6 10.2 15.4 6.4"></path><path d="M8.6 13.8 15.4 17.6"></path><circle cx="6.5" cy="12" r="2.5"></circle><circle cx="17.5" cy="5.25" r="2.5"></circle><circle cx="17.5" cy="18.75" r="2.5"></circle></svg></button>${state.hasPassword ? `<span class="lobby-lock-indicator" aria-label="${t('passwordProtected')}" title="${t('passwordProtected')}">🔒</span>` : ''}</h2><div class="row lobby-copy-row"><button class="btn" data-copy>${t('copyCode')}</button><span class="status" data-copy-status hidden>${t('copied')}</span></div></div><span class="status">${t('waiting')}</span></div>
      ${errorHtml()}
      <div class="section-gap-top"><h3>${t('players')} (${state.players.length})</h3><div class="lobby-player-grid">${players}</div></div>
      <div class="row lobby-actions">${state.isHost ? `<button class="btn btn-primary" data-start ${state.players.filter((p) => p.connected).length < 3 ? 'disabled' : ''}>${t('startGame')}</button>` : ''}<button class="btn btn-danger" data-leave>${t('leaveLobby')}</button></div>
      ${state.isHost && state.players.filter((p) => p.connected).length < 3 ? `<p class="muted section-gap-top">${t('minPlayers')}</p>` : ''}
    </section>
    <form id="settings" class="panel stack"><h3 class="panel-title">${t('settings')}</h3>
    <div class="field"><label class="label" for="mode">${t('mode')}<button type="button" class="info-icon" data-setting-info="mode" aria-label="${t('mode')}: Classic – ${t('classicInfo')} Hidden – ${t('hiddenInfo')}" aria-expanded="false">?</button></label><div class="rule-info-box" data-setting-info-box="mode" hidden><div class="rule-info-option"><strong>Classic:</strong> ${t('classicInfo')}</div><div class="rule-info-option"><strong>Hidden:</strong> ${t('hiddenInfo')}</div></div><select class="select" id="mode" ${state.isHost ? '' : 'disabled'}><option value="classic" ${cfg.mode === 'classic' ? 'selected' : ''}>Classic</option><option value="hidden" ${cfg.mode === 'hidden' ? 'selected' : ''}>Hidden</option></select></div>
    <div class="grid-2"><div><label class="label" for="rounds">${t('rounds')}<button type="button" class="info-icon" data-setting-info="rounds" aria-label="${t('rounds')}" aria-expanded="false">?</button></label><div class="rule-info-box" data-setting-info-box="rounds" hidden>${t('roundsInfo')}</div><select class="select" id="rounds" ${state.isHost ? '' : 'disabled'}>${[3,5,7,10].map((n) => `<option ${cfg.rounds === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div><label class="label" for="clues">${t('clueRounds')}<button type="button" class="info-icon" data-setting-info="clues" aria-label="${t('clueRounds')}" aria-expanded="false">?</button></label><div class="rule-info-box" data-setting-info-box="clues" hidden>${t('clueRoundsInfo')}</div><select class="select" id="clues" ${state.isHost ? '' : 'disabled'}>${[1,2,3].map((n) => `<option ${cfg.clueRounds === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
    <fieldset><legend class="label">${t('categories')}<button type="button" class="info-icon" data-setting-info="categories" aria-label="${t('categories')}" aria-expanded="false">?</button></legend><div class="rule-info-box" data-setting-info-box="categories" hidden>${t('categoriesInfo')}</div><label class="check"><input type="checkbox" id="all-categories" ${cfg.categories.length === CATEGORIES.length ? 'checked' : ''} ${state.isHost ? '' : 'disabled'}><strong>${t('allCategories')}</strong></label><div class="category-grid">${categories}</div></fieldset>
    </form>
  </div>`)
  document.querySelectorAll('[data-setting-info]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.settingInfo
    const box = document.querySelector(`[data-setting-info-box="${key}"]`)
    const opening = box.hidden
    document.querySelectorAll('[data-setting-info-box]').forEach((item) => { item.hidden = true })
    document.querySelectorAll('[data-setting-info]').forEach((item) => item.setAttribute('aria-expanded', 'false'))
    box.hidden = !opening
    button.setAttribute('aria-expanded', String(opening))
  }))
  if (state.isHost) document.querySelector('#settings').addEventListener('change', async (event) => {
    const boxes = [...document.querySelectorAll('[name="category"]')]
    if (event.target.id === 'all-categories') {
      boxes.forEach((box) => { box.checked = event.target.checked })
      if (!event.target.checked) boxes.find((box) => box.value === 'Allgemein').checked = true
    } else document.querySelector('#all-categories').checked = boxes.every((box) => box.checked)
    const chosen = boxes.filter((box) => box.checked).map((box) => box.value)
    await action('update-config', { mode: document.querySelector('#mode').value, rounds: Number(document.querySelector('#rounds').value), clueRounds: Number(document.querySelector('#clues').value), categories: chosen })
  })
}

function gameHeader(title, subtitle) { return `<section class="panel"><div class="spread"><div><div class="eyebrow">${t('roundOf', { current: state.round.number, total: state.config.rounds })}</div><h2>${title}</h2><p class="muted">${subtitle}</p></div><span class="status">${state.config.mode === 'classic' ? 'Classic' : 'Hidden'}</span></div></section>` }

function revealView() {
  const reveal = state.round.privateReveal
  const confirmed = player(state.selfId).hasConfirmed
  const secret = reveal.kind === 'imposter' ? `<div class="eyebrow">${t('yourRole')}</div><div class="secret-word">Imposter</div><p>${t('noWord')}</p>` : `<div class="eyebrow">${t('yourWord')}</div><div class="secret-word">${escapeHtml(reveal.word)}</div><p>${t('rememberWord')}</p>`
  const connected = state.players.filter((p) => p.connected).length
  const ratio = state.round.confirmedCount / connected * 100
  setView(shell(`${gameHeader(t('secretInfo'), t('lookPrivately'))}<section class="panel secret">${secret}<button class="btn btn-primary" data-confirm ${confirmed ? 'disabled' : ''}>${confirmed ? t('confirmedWaiting') : t('understood')}</button></section><section class="panel"><div class="spread"><span>${t('ready')}</span><span>${t('countOf', { current: state.round.confirmedCount, total: connected })}</span></div><div class="progress"><span style="width:${ratio}%"></span></div></section>`))
}

function clueView() {
  setView(shell(`${gameHeader(t('cluePhase', { current: state.round.clueRound, total: state.config.clueRounds }), t('describeWord'))}<section class="panel result-callout"><div class="eyebrow">${t('starter')}</div><h2>${t('begins', { name: escapeHtml(player(state.round.starterId)?.name || '—') })}</h2><p class="muted">${t('talkTogether')}</p></section>${state.isHost ? `<button class="btn btn-primary" data-advance>${state.round.clueRound < state.config.clueRounds ? t('nextClue') : t('startVote')}</button>` : `<p class="muted">${t('hostContinues')}</p>`}`))
}

function voteView() {
  const self = player(state.selfId); const title = state.phase === 'runoff' ? t('runoff') : t('whoImposter')
  const choices = state.round.allowedCandidateIds.map((id) => `<button class="btn choice ${selectedVote === id ? 'selected' : ''}" data-candidate="${id}" ${self.hasVoted ? 'disabled' : ''}><span class="player-name">${escapeHtml(player(id)?.name)}</span></button>`).join('')
  const connected = state.players.filter((p) => p.connected).length
  const ratio = state.round.votedCount / connected * 100
  setView(shell(`${gameHeader(title, state.phase === 'runoff' ? t('runoffHint') : t('voteFinalHint'))}<section class="panel"><div class="choice-grid">${choices}</div><button class="btn btn-primary vote-submit" data-submit-vote ${!selectedVote || self.hasVoted ? 'disabled' : ''}>${self.hasVoted ? t('voted') : t('submitVote')}</button></section><section class="panel"><div class="spread"><span>${t('votesCast')}</span><span>${t('countOf', { current: state.round.votedCount, total: connected })}</span></div><div class="progress vote-progress"><span style="width:${ratio}%"></span></div><p class="muted">${t('votesSecret')}</p></section>`))
}

function guessView() {
  const isImposter = state.round.guessOptions.length > 0
  setView(shell(`${gameHeader(t('caught'), t('guessHidden'))}<section class="panel result-callout">${isImposter ? `<div class="eyebrow">${t('lastTry')}</div><h2>${t('whichWord')}</h2><div class="choice-grid">${state.round.guessOptions.map((word) => `<button class="btn choice" data-guess="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join('')}</div>` : `<h2>${t('imposterGuessing')}</h2><p class="muted">${t('resultSoon')}</p>`}</section>`))
}

function resultView(finished = false) {
  const imposter = player(state.round.imposterId); const selected = player(state.round.selectedId)
  const votes = state.players.map((p) => `<li class="player"><span class="player-name">${escapeHtml(p.name)}</span><strong>${state.round.voteCounts?.[p.id] || 0} ${t('votes')}</strong></li>`).join('')
  const ranking = [...state.players].sort((a, b) => b.score - a.score).map((p, index) => `<li class="player"><div class="player-main"><span class="avatar">${index + 1}</span><span class="player-name">${escapeHtml(p.name)}</span></div><strong>${p.score} ${t('points')}</strong></li>`).join('')
  const title = finished ? t('gameFinished') : t('roundFinished', { round: state.round.number })
  setView(shell(`${gameHeader(title, finished ? t('finalScoreHint') : t('revealedHint'))}<section class="panel result-callout"><div class="eyebrow">${t('imposterWas')}</div><h2>${escapeHtml(imposter?.name)}</h2><p>${t('normalWord')}: <strong>${escapeHtml(state.round.mainWord)}</strong>${state.round.imposterWord ? `<br>${t('imposterWord')}: <strong>${escapeHtml(state.round.imposterWord)}</strong>` : ''}</p><h3 class="winner">${t('winner')}: ${state.round.winner === 'crew' ? t('crew') : 'Imposter'}</h3><p class="muted">${selected ? t('decisive', { name: escapeHtml(selected.name) }) : t('noDecision')}</p></section><section class="panel"><h2>${finished ? t('finalScore') : t('votesAndScore')}</h2><ul class="score-list">${finished ? ranking : votes}</ul></section>${state.isHost ? `<div class="row"><button class="btn btn-primary" data-next>${finished ? t('backLobby') : (state.round.number >= state.config.rounds ? t('showFinal') : t('nextRound'))}</button></div>` : `<p class="muted">${t('hostMovesOn')}</p>`}`, false))
}

function render() {
  if (!state) {
    const route = scopedRoute()
    if (route && route.page !== 'join' && routeReconnectPending) {
      setView(`<section class="panel join-page"><h2 class="panel-title">${t('lobby')} <span class="code">${escapeHtml(route.code)}</span></h2><div class="muted">${t('loading')}…</div></section>`)
      return
    }
    if (route && route.page !== 'join') {
      history.replaceState({}, '', `/join/${route.code}`)
    }
    if (validateJoinRoute()) return
    return joinCodeFromPath() ? joinView() : homeView()
  }
  selectedVote = player(state.selfId)?.hasVoted ? null : selectedVote
  if (state.phase === 'lobby') lobbyView()
  else if (state.phase === 'reveal') revealView()
  else if (state.phase === 'clue') clueView()
  else if (state.phase === 'vote' || state.phase === 'runoff') voteView()
  else if (state.phase === 'guess') guessView()
  else if (state.phase === 'result') resultView(false)
  else resultView(true)
}

function bindCommon() {
  document.querySelectorAll('[data-language]').forEach((select) => select.addEventListener('change', (event) => {
    const currentName = document.querySelector('#name')?.value.trim()
    if (currentName) localStorage.setItem(nameKey, currentName)
    draftCode = document.querySelector('#code')?.value.trim().toUpperCase() || draftCode
    language = event.target.value; localStorage.setItem(languageKey, language); document.documentElement.lang = language; render()
  }))
  const showCopiedStatus = () => {
    const status = document.querySelector('[data-copy-status]')
    if (!status) return
    status.hidden = false
    clearTimeout(showCopiedStatus.timer)
    showCopiedStatus.timer = setTimeout(() => { status.hidden = true }, 2200)
  }
  document.querySelector('[data-copy]')?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable')
      await navigator.clipboard.writeText(state.code)
      showCopiedStatus()
    } catch { showError(`${t('copyFailed')} ${t('lobbyCode')}: ${state.code}`) }
  })
  document.querySelector('[data-share]')?.addEventListener('click', async () => {
    const url = `${location.origin}/join/${state.code}`
    const shareData = { title: t('shareTitle'), text: t('shareText', { code: state.code }), url }
    if (navigator.share) {
      try { await navigator.share(shareData); return } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable')
      await navigator.clipboard.writeText(url)
      showCopiedStatus()
    } catch { showError(t('copyFailed')) }
  })
  document.querySelector('[data-abort]')?.addEventListener('click', () => action('abort-game'))
  document.querySelector('[data-start]')?.addEventListener('click', () => action('start'))
  document.querySelector('[data-leave]')?.addEventListener('click', () => { socket.emit('leave'); state = null; history.replaceState({}, '', '/'); render() })
  document.querySelector('[data-confirm]')?.addEventListener('click', () => action('confirm-reveal'))
  document.querySelector('[data-advance]')?.addEventListener('click', () => action('advance-clue'))
  document.querySelectorAll('[data-candidate]').forEach((button) => button.addEventListener('click', () => { selectedVote = button.dataset.candidate; render() }))
  document.querySelector('[data-submit-vote]')?.addEventListener('click', async () => { if (selectedVote) await action('vote', { targetId: selectedVote }) })
  document.querySelectorAll('[data-guess]').forEach((button) => button.addEventListener('click', () => action('guess', { word: button.dataset.guess })))
  document.querySelector('[data-next]')?.addEventListener('click', () => action(state.phase === 'finished' ? 'back-to-lobby' : 'next-round'))
}

socket.on('state', (view) => {
  state = view
  routeReconnectPending = false
  uiError = ''
  history.replaceState({}, '', state.phase === 'lobby' ? `/lobby/${state.code}` : `/game/${state.code}`)
  render()
})
socket.on('lobby-list', (list) => {
  lobbyList = Array.isArray(list) ? list : []
  lobbyListLoaded = true
  if (!state && joinCodeFromPath()) render()
  else renderLobbyList()
})
socket.on('connect', async () => {
  const route = scopedRoute()
  if (route) {
    const result = await call('reconnect-session', { sessionToken: token, code: route.code })
    if (!result?.ok) { state = null; routeReconnectPending = false; render() }
    return
  }
  const result = await call('reconnect-session', { sessionToken: token })
  if (!result?.ok) { state = null; render() }
})
socket.on('disconnect', () => showError(t('reconnecting')))
document.documentElement.lang = language
document.addEventListener('pointerdown', (event) => {
  if (donationOpen && !event.target.closest?.('.site-donate')) { donationOpen = false; renderFooter() }
})
window.addEventListener('scroll', () => { if (donationOpen) { donationOpen = false; renderFooter() } }, { passive: true })
render()
