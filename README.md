# Imposter

Ein kleines, serverseitig gesteuertes Multiplayer-Partyspiel mit Classic- und Hidden-Modus.

## Start

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen. Zum lokalen Test mehrerer Spieler können getrennte Browserprofile oder private Fenster verwendet werden.

## Docker und Portainer

Das öffentliche Produktionsimage wird als `steinente/imposter:latest` veröffentlicht. Die vollständige Einrichtung von Docker Hub, GitHub Actions und Portainer ist in [DEPLOYMENT.md](DEPLOYMENT.md) beschrieben.

Lokaler Test des fertigen Images:

```bash
docker compose up -d
```

Danach ist die Anwendung standardmäßig unter `http://localhost:8082` erreichbar.

## Architektur

- Express liefert die responsive Weboberfläche aus.
- Socket.IO synchronisiert Lobby und Spiel in Echtzeit.
- Rollen, Wörter und offene Stimmen liegen ausschließlich im Serverzustand.
- Jeder Client erhält eine personalisierte Sicht; fremde Geheimnisse werden nicht übertragen.
- Ein zufälliges Session-Token im Browser ermöglicht Reconnects.

Der Zustand ist absichtlich flüchtig und wird bei einem Serverneustart verworfen. Für mehrere Serverinstanzen wäre ein gemeinsamer State Store erforderlich.
