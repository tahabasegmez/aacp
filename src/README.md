# src

Clean Architecture. Dependencies always point inward, and `domain` depends on
nothing.

```
core            shared kernel — config, errors, ports, utils
domain          business rules — entities, repository ports, use cases
data            repository implementations, mappers, sync adapters
infrastructure  fetch, RSS, track-player, MMKV, downloads, telemetry
presentation    React Native UI — screens, stores, queries, theme
carplay         CarPlay surface — same use cases, its own templates
app             composition root — the only place things are wired together
```

## Where things go

- **Business rule** → `domain/usecases`. Plain TypeScript, no React or libraries.
- **New data source or player library** → one adapter in `data` or `infrastructure`.
- **Screen** → `presentation/features/<feature>`, with its own components.
- **Component used by several features** → `presentation/shared/components`.
- **`new SomeImpl()`** → `app/di`, nowhere else.

## Imports

Path aliases: `@core`, `@domain`, `@data`, `@infrastructure`, `@presentation`,
`@carplay`, `@app`.

```ts
import { Show } from '@domain/entities';
import { useShowsQuery } from '@presentation';
```

## The one rule

`presentation` and `carplay` never import `data` or `infrastructure`, and never
import each other. They use `@domain` use cases only; concrete objects are
injected from `app/di`.
