# AACP — Podcast

A React Native podcast app for **iOS (with Apple CarPlay)** and **Android**,
backed by a Cloudflare Worker API. Show and episode data comes from RSS feeds.

## Quick start

```sh
npm install                      # .npmrc handles legacy-peer-deps
cd ios && pod install && cd ..   # macOS only
npm start                        # Metro
npm run ios                      # or: npm run android
```

Quality gate — no native toolchain needed, runs on any OS:

```sh
npm run ci                       # typecheck + lint + test
```

Configuration is optional. Copy `.env.example` to `.env` to point the app at a
backend; without it the app runs fully local (no sync, no account). Values are
baked in at build time, so **rebuild** after changing them.

## Features

Browse and search shows · paginated episode lists · playback with resume ·
queue with user-added items ahead of the auto context · playlists and "listen
later" · offline downloads · cross-device sync · accounts · one active device
per account with playback transfer · share links that open in the app ·
CarPlay (browse, play, now playing, voice) · lock screen and Android media
controls.

## Architecture

Clean Architecture. Dependencies always point inward; `domain` is plain
TypeScript with no React, React Native or library imports, so the business
rules are platform independent and testable anywhere.

```
core            shared kernel — config, errors, ports, utils
domain          business rules — entities, repository ports, use cases
data            repository implementations, mappers, sync adapters
infrastructure  fetch, RSS, track-player, MMKV, downloads, telemetry
presentation    React Native UI — screens, stores, queries, theme
carplay         CarPlay surface — same use cases, its own templates
app             composition root — the only place things are wired together
```

`presentation` and `carplay` never talk to each other; they share behaviour by
sharing use cases. Swapping a data source or a player library means changing
one adapter, not the screens.

See [src/README.md](src/README.md) for the folder map.

## Backend

`worker/` is a Cloudflare Worker (TypeScript) fronting Supabase Postgres,
Redis and KV. It serves the show catalog and episode pages, handles auth and
cross-device sync, hosts share links, and runs a cron job that scans feeds for
new episodes through a queue.

```sh
cd worker
npm install
npx wrangler dev                 # local
npx wrangler deploy              # publish
```

Full setup — Supabase project, SQL schemas in order, Redis, KV, queue, secrets
and seeding the catalog: **[docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md)**.

Secrets go in `worker/.dev.vars` locally and `wrangler secret put` in
production — never in the root `.env`, which is embedded into the app binary.

## Embedding

The podcast feature can be dropped into another React Native app.
[embed.ts](embed.ts) is the stable surface: it exports the providers,
navigator and overlays so the host app keeps its own navigation container.

## Testing

```sh
npm test                         # 361 tests
npm test -- src/domain           # a folder
npm test -- -t "queue"           # by name
```

Tests sit in `__tests__` folders next to the code they cover. Native modules
are mocked in `__mocks__/`, so the whole suite — including the CarPlay
controller — runs without Xcode.

## Stack

React Native 0.86 (New Architecture) · TypeScript · TanStack Query · Zustand ·
React Navigation · FlashList · react-native-track-player · react-native-carplay ·
react-native-mmkv · Cloudflare Workers · Supabase
