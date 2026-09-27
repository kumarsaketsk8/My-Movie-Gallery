import { isTmdbConfigured, posterUrl, searchMovies, type TmdbMovie } from './lib/tmdb'

type MovieDraft = TmdbMovie & {
  id: string
  rating: number
  watchedOn: string
  comment: string
}

const today = new Date().toISOString().slice(0, 10)
const ratingLabels = ['Not for me', 'A nice evening', 'Really liked it', 'Loved it', 'Instant personal classic']
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)

export function initEntryDesk() {
  const app = document.querySelector<HTMLElement>('#app')!
  const drafts: MovieDraft[] = []
  let searchResults: TmdbMovie[] = []
  let searchState: 'idle' | 'loading' | 'error' = 'idle'
  let searchError = ''
  let searchTimer: number | undefined
  let searchController: AbortController | undefined

  app.innerHTML = `
    <div class="entry-shell">
      <header class="entry-header">
        <a class="wordmark" href="#top" aria-label="My Movie Gallery entry desk">MY MOVIE GALLERY</a>
        <span class="entry-kicker">Entry desk</span>
      </header>
      <main class="entry-layout" id="top">
        <section class="entry-intro" aria-labelledby="entry-title">
          <p class="eyebrow">Tonight’s log</p>
          <h1 id="entry-title">Add the films<br>that stayed with you.</h1>
          <p class="entry-lede">Search, select, then give each film its own after-credits note. Add as many to this batch as you like.</p>
          <p class="tmdb-note">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </section>
        <section class="entry-panel" aria-labelledby="search-title">
          <div class="panel-heading">
            <div><p class="eyebrow">01 / Select films</p><h2 id="search-title">What did you watch?</h2></div>
            <span class="selection-count" id="selection-count">0 selected</span>
          </div>
          <label class="movie-search-label" for="movie-search">Search the film library</label>
          <div class="search-field">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg>
            <input id="movie-search" type="search" autocomplete="off" placeholder="Try “Inception” or “The Godfather”">
          </div>
          <div class="movie-results" id="movie-results" role="listbox" aria-label="Movie search results"></div>
          <div class="batch-heading">
            <div><p class="eyebrow">02 / Your batch</p><h2>Give each film its moment.</h2></div>
            <p class="batch-hint">A film can only appear once in your collection.</p>
          </div>
          <div class="draft-list" id="draft-list" aria-live="polite"></div>
          <p class="empty-state" id="empty-state">Select a film above to begin your batch.</p>
          <footer class="entry-footer">
            <p class="save-status" id="save-status">Your batch remains on this page until local saving is connected.</p>
            <button class="save-batch" id="save-batch" type="button" disabled>Save batch</button>
          </footer>
        </section>
      </main>
    </div>`

  const search = app.querySelector<HTMLInputElement>('#movie-search')!
  const results = app.querySelector<HTMLElement>('#movie-results')!
  const draftList = app.querySelector<HTMLElement>('#draft-list')!
  const count = app.querySelector<HTMLElement>('#selection-count')!
  const emptyState = app.querySelector<HTMLElement>('#empty-state')!
  const saveButton = app.querySelector<HTMLButtonElement>('#save-batch')!
  const saveStatus = app.querySelector<HTMLElement>('#save-status')!

  function renderResults() {
    const term = search.value.trim()
    if (!isTmdbConfigured) {
      results.innerHTML = '<p class="no-results">Add a TMDB access token to <code>.env.local</code> to search the film library.</p>'
      return
    }
    if (term.length < 2) {
      results.innerHTML = '<p class="no-results">Type at least two characters to search TMDB.</p>'
      return
    }
    if (searchState === 'loading') {
      results.innerHTML = '<p class="no-results">Searching the film library…</p>'
      return
    }
    if (searchState === 'error') {
      results.innerHTML = `<p class="no-results">${escapeHtml(searchError)} Try again.</p>`
      return
    }
    results.innerHTML = searchResults.map((movie) => {
      const selected = drafts.some((draft) => draft.tmdbId === movie.tmdbId)
      const imageUrl = posterUrl(movie.posterPath, 'w92')
      return `
        <button class="movie-result" type="button" data-tmdb-id="${movie.tmdbId}" role="option" aria-selected="${selected}" ${selected ? 'disabled' : ''}>
          <span class="result-poster">${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy">` : escapeHtml(movie.title.slice(0, 1))}</span>
          <span class="result-copy"><strong>${escapeHtml(movie.title)}</strong><span>${movie.releaseYear ?? 'Release year unavailable'} · TMDB</span></span>
          <span class="result-action">${selected ? 'In batch' : 'Add'}</span>
        </button>`
    }).join('') || '<p class="no-results">No films matched that search.</p>'
  }

  function renderDrafts() {
    draftList.innerHTML = drafts.map((draft, index) => {
      const imageUrl = posterUrl(draft.posterPath)
      return `
        <article class="movie-draft" data-id="${draft.id}">
          <div class="draft-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
          <div class="draft-poster">${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy">` : `<span>${escapeHtml(draft.title.slice(0, 1))}</span>`}</div>
          <div class="draft-body">
            <div class="draft-title-row">
              <div><h3>${escapeHtml(draft.title)}</h3><p>${draft.releaseYear ?? 'Release year unavailable'} · TMDB</p></div>
              <button class="remove-draft" type="button" data-remove="${draft.id}" aria-label="Remove ${escapeHtml(draft.title)} from this batch">Remove</button>
            </div>
            <div class="draft-fields">
              <fieldset class="rating-fieldset"><legend>Your rating</legend>
                <div class="rating-lights" role="radiogroup" aria-label="Rating for ${escapeHtml(draft.title)}">
                  ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" class="rating-light ${rating <= draft.rating ? 'is-lit' : ''}" data-rating="${rating}" data-id="${draft.id}" role="radio" aria-checked="${rating === draft.rating}" aria-label="${rating} of 5 — ${ratingLabels[rating - 1]}"><span></span></button>`).join('')}
                </div>
                <p class="rating-label">${ratingLabels[draft.rating - 1]}</p>
              </fieldset>
              <label class="watched-field">Watched on<input type="date" data-date="${draft.id}" value="${draft.watchedOn}"></label>
            </div>
            <label class="comment-field">After-credits thought <span><span data-count="${draft.id}">${draft.comment.length}</span>/140</span>
              <textarea data-comment="${draft.id}" maxlength="140" placeholder="The one thought you’ll remember...">${escapeHtml(draft.comment)}</textarea>
            </label>
          </div>
        </article>`
    }).join('')
    count.textContent = `${drafts.length} selected`
    emptyState.hidden = drafts.length > 0
    saveButton.disabled = drafts.length === 0
    saveButton.textContent = drafts.length ? `Save ${drafts.length} ${drafts.length === 1 ? 'movie' : 'movies'}` : 'Save batch'
    renderResults()
  }

  function addMovie(tmdbId: number) {
    const movie = searchResults.find((item) => item.tmdbId === tmdbId)
    if (!movie || drafts.some((draft) => draft.tmdbId === tmdbId)) return
    drafts.push({ ...movie, id: crypto.randomUUID(), rating: 3, watchedOn: today, comment: '' })
    search.value = ''
    searchResults = []
    renderDrafts()
  }

  results.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tmdb-id]')
    if (target) addMovie(Number(target.dataset.tmdbId))
  })

  search.addEventListener('input', () => {
    window.clearTimeout(searchTimer)
    searchController?.abort()
    const query = search.value.trim()
    searchResults = []
    searchError = ''
    if (query.length < 2 || !isTmdbConfigured) {
      searchState = 'idle'
      renderResults()
      return
    }
    searchState = 'loading'
    renderResults()
    searchTimer = window.setTimeout(async () => {
      const controller = new AbortController()
      searchController = controller
      try {
        const movies = await searchMovies(query, controller.signal)
        if (search.value.trim() !== query) return
        searchResults = movies
        searchState = 'idle'
      } catch (error) {
        if (controller.signal.aborted) return
        searchState = 'error'
        searchError = error instanceof Error ? error.message : 'Unable to reach TMDB.'
      }
      renderResults()
    }, 300)
  })

  draftList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const ratingButton = target.closest<HTMLButtonElement>('[data-rating]')
    if (ratingButton) {
      const draft = drafts.find((item) => item.id === ratingButton.dataset.id)
      if (draft) draft.rating = Number(ratingButton.dataset.rating)
      renderDrafts()
      return
    }
    const removeButton = target.closest<HTMLButtonElement>('[data-remove]')
    if (removeButton) {
      const index = drafts.findIndex((item) => item.id === removeButton.dataset.remove)
      if (index >= 0) drafts.splice(index, 1)
      renderDrafts()
    }
  })

  draftList.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    const draft = drafts.find((item) => item.id === target.dataset.date || item.id === target.dataset.comment)
    if (!draft) return
    if (target.dataset.date) draft.watchedOn = target.value
    if (target.dataset.comment) {
      draft.comment = target.value
      const counter = draftList.querySelector<HTMLElement>(`[data-count="${draft.id}"]`)
      if (counter) counter.textContent = String(draft.comment.length)
    }
  })

  saveButton.addEventListener('click', () => {
    saveStatus.textContent = 'Your batch is ready. Connect local storage next to keep it in your private collection.'
  })

  renderResults()
}
