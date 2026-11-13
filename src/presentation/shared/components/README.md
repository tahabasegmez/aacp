# shared/components

Components used by more than one feature, such as `Button`, `ArtworkImage`,
`EmptyState` and `ErrorView`. A component used by a single feature stays in
that feature's own `components/` folder.

Keep them dumb: take props and render. No business logic, no data fetching.
