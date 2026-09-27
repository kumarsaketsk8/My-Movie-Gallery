# My Movie Gallery — Project Decisions

## How this document is used

This is the living source of truth for confirmed decisions. Update it whenever a product, UX, data, technical, or scope decision is made; do not record ideas as decisions until they are agreed.

Each entry in the decision log records the choice, why it was made, and its scope. Newer entries supersede older ones when they conflict.

## Product intent

My Movie Gallery is a private, mobile-friendly personal movie museum. It lets a person record films they have watched, their rating, and one short personal thought, then wander through the collection as an immersive gallery rather than a conventional list or grid.

The museum interaction should feel like a slow, visual walkthrough: one movie occupies one room or viewport at a time. The visual direction is informed by the pacing and immersion of the Color Museum reference, without copying its design.

## Scope

### Included

- Search for a film and choose it from verified results.
- Store a 1–5 personal rating.
- Store one optional personal comment, limited to 140 characters.
- Use an official movie poster as the artwork in the museum.
- Browse watched films in a responsive scroll-snap museum experience.
- Keep the collection private and available on the user’s device.

### Explicitly out of scope

- AI-generated posters or image-generation costs.
- Free-form movie-name entry.
- Public profiles, social sharing, or shareable gallery links.
- Accounts, collaborative collections, or social features.

## Core user flow

1. The user searches for a movie title.
2. The interface shows matching, canonical results.
3. The user selects exactly one result; they cannot save arbitrary text as a movie.
4. The user assigns a rating using a playful five-light interaction.
5. The user adds an optional one-line “after-credits thought.”
6. The film is added to the museum and appears with its official poster, rating, and thought.
7. The user swipes or scrolls through the museum, one film at a time.

## Data-source decision

### Decision: use TMDB for search and official poster display

TMDB is the chosen source for movie search, metadata, and official poster image paths.

Reasons:

- Its developer API is free for personal, non-commercial use with required attribution.
- It provides title search, release year, media type, and poster image paths in one product.
- Poster images can be displayed directly from TMDB’s image CDN instead of being copied into our own storage.
- This avoids image-generation costs and avoids scraping IMDb.

Required attribution:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

The TMDB logo and this statement should live in an About or Credits view.

### IMDb role

IMDb remains a reference identifier, not the poster provider. When available from TMDB’s external-ID data, save the film’s `imdbId` beside its `tmdbId`.

This preserves an exact, stable IMDb reference without scraping IMDb or reusing IMDb-hosted artwork.

## Storage decision

### Decision: private browser storage for version one

The gallery is private, so version one stores the collection locally in the browser using IndexedDB. This avoids an account system, backend database, file hosting, and recurring cost.

Save only the metadata needed to rebuild the museum:

```text
MovieEntry
- id
- tmdbId
- imdbId (when available)
- title
- releaseYear
- posterPath
- rating: 1–5
- comment: up to 140 characters
- addedAt
```

Poster images are not uploaded to or stored by this project. The app renders TMDB poster URLs from `posterPath` at display time.

## Interaction decisions

### Search before entry

The user must select a search result. This avoids duplicate, misspelled, or ambiguous movie records.

### Rating: “gallery lights”

Rating uses five small lights or stars that progressively illuminate. It should communicate feeling rather than look like a form field.

Suggested labels:

| Rating | Label |
| --- | --- |
| 1 | Not for me |
| 2 | A nice evening |
| 3 | Really liked it |
| 4 | Loved it |
| 5 | Instant personal classic |

### Museum navigation

- One film per screen on mobile.
- Horizontal or vertical CSS scroll snapping.
- Poster is the focal point; title, year, rating, and comment are secondary wall-label information.
- Tapping a poster opens an editorial detail view to edit the rating or thought.
- Respect reduced-motion preferences.

## Technical shape for version one

```text
Responsive web page
  ├── TMDB search API
  ├── TMDB image CDN for poster display
  └── IndexedDB for private local collection data
```

This is deliberately a lightweight website, not a native app or a multi-service platform. A small server-side proxy can be added later if protecting the TMDB token becomes necessary.

## Future possibilities, not current commitments

- Optional sign-in and cloud backup.
- A read-only share link.
- Importing an existing watched-movie list.
- Collection filters by year, director, genre, or rating.
- Poster alternatives based on locale or language.

## Sources to observe during implementation

- TMDB API FAQ: https://developer.themoviedb.org/docs/faq
- TMDB image basics: https://developer.themoviedb.org/docs/image-basics
- TMDB API terms and attribution: https://www.themoviedb.org/api-terms-of-use

## Decision log

### 2026-09-24 — Private, local-first gallery

**Decision:** The first version is private and stores a collection only on the user’s device. Sharing, accounts, and cloud backup are deferred.

**Why:** It keeps the project inexpensive and focused on personal reflection rather than social features.

### 2026-09-24 — TMDB supplies posters and search

**Decision:** TMDB is used for canonical movie search and official poster display. The application displays TMDB-hosted poster images rather than generating or storing poster copies.

**Why:** This removes AI-image generation cost and provides a practical free, non-commercial path with attribution.

### 2026-09-24 — IMDb is a reference identifier only

**Decision:** Save an IMDb ID when TMDB provides one, but do not scrape IMDb or use IMDb-hosted images.

**Why:** IMDb IDs are durable title references, while IMDb poster reuse is not the chosen media source.

### 2026-09-24 — Selection-only movie entry

**Decision:** A movie must be selected from search results before it can enter the museum.

**Why:** This prevents typos, ambiguous titles, and duplicate free-form records.

### 2026-09-24 — Cinematic gallery prototype

**Decision:** The first visual prototype is a scroll-driven Three.js theatre corridor with five locally generated placeholder poster textures. It uses a dark burgundy palette, red carpet, warm marquee-style lighting, fog, and a subtle reflective floor.

**Why:** It establishes the intended movie-theatre mood and immersive walkthrough before TMDB search, browser storage, and official poster rendering are connected. The placeholders are temporary and do not introduce AI-generated or externally hosted poster assets.

### 2026-09-24 — Supabase prepared for future sync

**Decision:** Add an optional Supabase client configuration, but keep version one local-first until accounts and cross-device sync are intentionally introduced.

**Why:** It makes a future migration path available without requiring sign-in, cloud storage, or a database connection for the private prototype. No Supabase credentials are committed to the repository.

### 2026-09-24 — Per-user Supabase watch records

**Decision:** Supabase stores only `watched_movies` records owned by an authenticated user. Each record carries its TMDB ID, title, poster path, 1–5 rating, watched date, and optional 140-character after-credits comment. A `(user_id, tmdb_id)` constraint permits one saved record per movie per user.

**Why:** TMDB remains the canonical movie catalogue and poster host, avoiding a duplicate global movie repository or image storage. Row Level Security ensures a signed-in person can access only their own watch records.

### 2026-09-24 — Batch movie entry

**Decision:** A person can assemble multiple selected films in one entry batch, set an independent rating, watched date, and after-credits thought for each, then save the batch together after signing in.

**Why:** Logging a run of recently watched films should not require repeating the full entry flow one movie at a time. Canonical search selection remains required for every film in the batch.
