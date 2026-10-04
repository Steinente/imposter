# Imposter mit Docker Hub und Portainer veröffentlichen

Die GitHub Action baut und testet Imposter und veröffentlicht anschließend ein Multi-Arch-Image für `linux/amd64` und `linux/arm64` unter `steinente/imposter`. Die Compose-Datei lädt dieses fertige Image; Portainer muss den Quellcode daher nicht selbst bauen.

## 1. Öffentliche Repositories anlegen

1. Lege auf GitHub ein öffentliches Repository für Imposter an und pushe dieses Projekt auf den Branch `main`.
2. Lege auf Docker Hub das öffentliche Repository `steinente/imposter` an.
3. Falls dein Docker-Hub-Benutzername nicht `steinente` lautet, ändere `IMAGE_NAME` in `.github/workflows/docker-publish.yml` und `image` in `docker-compose.yml` auf denselben Namen.

## 2. Docker-Hub-Zugang in GitHub hinterlegen

1. Erzeuge in Docker Hub unter **Account settings → Personal access tokens** ein Token mit Lese- und Schreibzugriff.
2. Öffne im GitHub-Repository **Settings → Secrets and variables → Actions**.
3. Lege diese Repository-Secrets an:
   - `DOCKERHUB_USERNAME`: `steinente`
   - `DOCKERHUB_TOKEN`: das soeben erzeugte Docker-Hub-Token

Verwende nicht dein Docker-Hub-Passwort als Secret.

## 3. Image erstmalig bauen

Pushe die Dateien auf `main`. Alternativ kannst du unter **Actions → Build and publish Docker image → Run workflow** einen manuellen Lauf starten.

Der Workflow führt TypeScript-Prüfung, Tests und Build aus. Nur wenn alles erfolgreich ist, werden unter anderem diese Tags veröffentlicht:

- `steinente/imposter:latest` für den aktuellen Stand von `main`
- `steinente/imposter:sha-...` als unveränderlicher Commit-Tag
- bei Git-Tags wie `v1.2.0` zusätzlich `1.2.0` und `1.2`

Kontrolliere anschließend auf Docker Hub, ob `steinente/imposter:latest` vorhanden und öffentlich abrufbar ist.

## 4. Stack in Portainer anlegen

Empfohlen ist die direkte Anbindung des öffentlichen GitHub-Repositories:

1. Öffne in Portainer die gewünschte Docker-Umgebung.
2. Wähle **Stacks → Add stack**.
3. Vergib den Namen `imposter`.
4. Wähle **Git repository**.
5. Trage die öffentliche HTTPS-URL des GitHub-Repositories ein. Eine Authentifizierung ist für ein öffentliches Repository nicht nötig.
6. Wähle als Repository-Referenz `refs/heads/main`.
7. Trage als Compose-Pfad `docker-compose.yml` ein.
8. Lege optional unter **Environment variables** fest:
   - `IMPOSTER_PORT`: veröffentlichter Host-Port, standardmäßig `8082`
   - `IMPOSTER_TAG`: Image-Tag, standardmäßig `latest`
9. Klicke auf **Deploy the stack**.

Danach ist Imposter standardmäßig unter `http://SERVER-IP:8082` erreichbar. Für einen anderen Port setzt du beispielsweise `IMPOSTER_PORT=8090`.

## 5. Domain und Reverse Proxy

Leite deine gewünschte Domain im Reverse Proxy auf `http://PORTAINER-HOST:8082` weiter und aktiviere HTTPS. WebSocket-Verbindungen müssen weitergeleitet werden, weil Socket.IO sie für das Multiplayer-Spiel verwendet. Bei Nginx Proxy Manager genügt normalerweise die Option **Websockets Support**.

## 6. Neue Version veröffentlichen

1. Pushe Änderungen auf `main`.
2. Warte, bis die GitHub Action erfolgreich beendet ist und das neue `latest`-Image auf Docker Hub liegt.
3. Öffne den Stack in Portainer und wähle **Pull and redeploy** beziehungsweise **Update the stack**.
4. Aktiviere dabei **Re-pull image**, damit Portainer das neue Image lädt.

Die Compose-Datei verwendet zusätzlich `pull_policy: always`. Für automatische Aktualisierungen kannst du in Portainer GitOps-Updates mit **Re-pull image** und **Force redeployment** oder einen Stack-Webhook konfigurieren.

## Wichtige Betriebshinweise

- Lobby- und Spielzustände liegen ausschließlich im Arbeitsspeicher. Ein Container-Neustart beendet daher laufende Spiele.
- Betreibe aktuell nur eine Instanz des Containers. Mehrere Replikate benötigen einen gemeinsamen State Store und Socket.IO-Adapter.
- Der Container läuft ohne Root-Rechte und stellt intern Port `3000` bereit.
- Der Healthcheck ist unter `/health` erreichbar und wird von Docker beziehungsweise Portainer ausgewertet.
