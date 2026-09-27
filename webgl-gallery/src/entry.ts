type CatalogMovie = { tmdbId: number; title: string; releaseYear: number; posterTone: string; posterAccent: string; posterUrl: string }

const catalog: CatalogMovie[] = [
  { tmdbId: 27205, title: 'Inception', releaseYear: 2010, posterTone: '#4d6d87', posterAccent: '#d6bd8e', posterUrl: 'https://image.tmdb.org/t/p/w780/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg' },
  { tmdbId: 155, title: 'The Dark Knight', releaseYear: 2008, posterTone: '#15212d', posterAccent: '#769fc0', posterUrl: 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { tmdbId: 238, title: 'The Godfather', releaseYear: 1972, posterTone: '#634637', posterAccent: '#d5b58e', posterUrl: 'https://image.tmdb.org/t/p/w780/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
  { tmdbId: 157336, title: 'Interstellar', releaseYear: 2014, posterTone: '#2c425c', posterAccent: '#f1d1a2', posterUrl: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { tmdbId: 19404, title: 'Dilwale Dulhania Le Jayenge', releaseYear: 1995, posterTone: '#7b2731', posterAccent: '#e9b36f', posterUrl: 'https://image.tmdb.org/t/p/w780/2CAL2433ZeIihfX1Hb2139CX0pW.jpg' },
]
const storageKey = 'my-movie-gallery-name'
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
const normaliseName = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 50)

export function initEntryDesk() {
  const app = document.querySelector<HTMLElement>('#app')!
  const nameFromReturnLink = normaliseName(new URLSearchParams(window.location.search).get('gallery') ?? '')
  let galleryName = nameFromReturnLink || normaliseName(localStorage.getItem(storageKey) ?? '')
  if (nameFromReturnLink) localStorage.setItem(storageKey, nameFromReturnLink)
  let selectedMovie: CatalogMovie | null = null
  let rating = 0
  let thought = ''
  const updateTitle = (name: string) => {
    document.title = `${name} · Movie Gallery`
    document.querySelector('#museum')?.setAttribute('aria-label', `${name}, a cinematic movie gallery. Scroll to walk through the exhibition.`)
  }

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    if (target?.matches('input, textarea, select, [contenteditable="true"]')) return

    const scrollDelta = ({ KeyW: 720, KeyD: 720, KeyS: -720, KeyA: -720, Numpad8: 720, Numpad6: 720, Numpad2: -720, Numpad4: -720 } as Record<string, number | undefined>)[event.code]
    if (!scrollDelta) return

    event.preventDefault()
    if (app.querySelector('.gallery-ui')) {
      window.dispatchEvent(new CustomEvent('gallery:keyboard-scroll', { detail: { delta: scrollDelta } }))
      return
    }
    app.scrollBy({ top: scrollDelta, behavior: 'smooth' })
  })

  function renderEntrance() {
    app.scrollTop = 0
    window.dispatchEvent(new Event('gallery:exited'))
    app.innerHTML = `<main class="arrival" aria-labelledby="entry-title"><div class="arrival-scroll"><section class="arrival-stage"><img class="arrival-render" src="/museum-arrival.jpg" alt="A cinematic movie gallery entrance with a red carpet and illuminated marquee board."><div class="arrival-vignette" aria-hidden="true"></div><p class="arrival-kicker">Private collection · Est. 2026</p><p class="arrival-prompt">Scroll to approach the marquee <span aria-hidden="true">↓</span></p><section class="arrival-editor" aria-live="polite"><div class="arrival-marquee-copy"><p>Now welcoming you to</p><h1 id="entry-title">${escapeHtml(galleryName)}</h1><small>Private movie collection</small></div><form class="gallery-name-form" novalidate><label for="gallery-name">What should we call your gallery?</label><div class="gallery-name-row"><input id="gallery-name" maxlength="50" autocomplete="off" placeholder="e.g. The Midnight Matinée" value="${escapeHtml(galleryName)}" aria-describedby="gallery-name-note"><button class="entry-button" type="submit">Enter gallery <span aria-hidden="true">→</span></button></div><div class="field-meta"><span id="gallery-name-note">Up to 50 characters</span><span id="name-count">${galleryName.length}/50</span></div><p class="name-error" role="alert"></p></form></section></section></div></main>`
    const arrival = app.querySelector<HTMLElement>('.arrival')!
    const form = app.querySelector<HTMLFormElement>('.gallery-name-form')!
    const input = app.querySelector<HTMLInputElement>('#gallery-name')!
    const error = app.querySelector<HTMLElement>('.name-error')!
    const marqueeCopy = app.querySelector<HTMLElement>('.arrival-marquee-copy')!
    const marqueeTitle = marqueeCopy.querySelector<HTMLElement>('h1')!
    marqueeCopy.querySelector('p')?.remove()
    marqueeTitle.remove()
    form.id = 'gallery-name-form'
    input.id = 'entry-title'
    input.className = 'marquee-name-input'
    input.value = galleryName
    input.placeholder = 'NAME YOUR GALLERY'
    input.setAttribute('form', form.id)
    input.setAttribute('aria-label', 'Name your gallery')
    marqueeCopy.insertBefore(input, marqueeCopy.querySelector('small'))
    marqueeCopy.append(error)
    marqueeCopy.insertAdjacentHTML('beforeend', '<button class="marquee-enter" type="submit" form="gallery-name-form">Enter gallery</button>')
    const marqueeEnter = app.querySelector<HTMLButtonElement>('.marquee-enter')!
    form.replaceChildren()
    const updateArrival = () => {
      const progress = Math.min(1, app.scrollTop / Math.max(1, app.clientHeight * 1.55))
      const easedProgress = progress * progress * (3 - 2 * progress)
      arrival.style.setProperty('--arrival-progress', easedProgress.toFixed(3))
      arrival.classList.toggle('is-ready', progress > 0.56)
    }
    app.onscroll = updateArrival
    updateArrival()
    const fitMarqueeName = () => {
      input.style.fontSize = ''
      const styles = window.getComputedStyle(input)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      context.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`
      const copy = (input.value || input.placeholder).toUpperCase()
      const letterSpacing = Number.parseFloat(styles.letterSpacing)
      const textWidth = context.measureText(copy).width + Math.max(0, copy.length - 1) * (Number.isFinite(letterSpacing) ? letterSpacing : 0)
      const scale = Math.min(1, Math.max(.28, (input.clientWidth - 10) / Math.max(1, textWidth)))
      input.style.fontSize = `${Number.parseFloat(styles.fontSize) * scale}px`
    }
    requestAnimationFrame(fitMarqueeName)
    input.addEventListener('input', () => { input.value = input.value.slice(0, 50); fitMarqueeName(); error.textContent = '' })
    const enterWalkthrough = () => {
      const name = normaliseName(input.value)
      if (!name) { error.textContent = 'Give your gallery a name before entering.'; input.focus(); return }
      marqueeEnter.disabled = true
      marqueeEnter.textContent = 'Entering gallery…'
      galleryName = name
      localStorage.setItem(storageKey, galleryName)
      updateTitle(galleryName)
      window.setTimeout(() => {
        const walkthrough = new URL('/rectangular-gallery.html', window.location.origin)
        walkthrough.searchParams.set('gallery', galleryName)
        window.location.assign(walkthrough)
      }, 1000)
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      enterWalkthrough()
    })
    marqueeEnter.addEventListener('click', (event) => {
      event.preventDefault()
      enterWalkthrough()
    })
  }

  function renderGallery() {
    app.innerHTML = `<main class="gallery-ui"><header class="gallery-nav"><button class="wordmark" type="button" aria-label="Rename gallery"><span>Collection of</span>${escapeHtml(galleryName)}</button><p class="nav-caption">WASD to explore</p><div class="gallery-actions"><button class="manage-gallery-trigger" type="button">Manage gallery</button><button class="add-film-trigger" type="button"><span aria-hidden="true">+</span> Add a film</button></div></header><aside class="gallery-plaque" aria-label="Exhibition note"><span class="plaque-rule"></span><p>Tonight’s exhibition</p><strong>${escapeHtml(galleryName)}</strong><span class="plaque-rule"></span></aside><section class="curator-desk" hidden aria-labelledby="desk-title"><div class="desk-header"><div><p class="eyebrow">Curator’s desk</p><h2 id="desk-title">Add a film to the collection</h2></div><button class="desk-close" type="button" aria-label="Close curator’s desk">×</button></div><label class="search-label" for="movie-search">Search the archive</label><div class="search-field"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg><input id="movie-search" type="search" autocomplete="off" placeholder="Start typing a title…"></div><section class="results-section" id="results-section" hidden aria-labelledby="results-title"><div class="section-heading"><h3 id="results-title">Matches</h3><span id="results-count"></span></div><div class="movie-rail" id="movie-results" role="listbox" aria-label="Movie search results"></div></section><section class="review-section" id="review-section" hidden aria-labelledby="review-title"></section></section><section class="gallery-manager" hidden aria-labelledby="manager-title"></section></main>`
    const desk = app.querySelector<HTMLElement>('.curator-desk')!
    const search = app.querySelector<HTMLInputElement>('#movie-search')!
    const resultsSection = app.querySelector<HTMLElement>('#results-section')!
    const results = app.querySelector<HTMLElement>('#movie-results')!
    const resultsCount = app.querySelector<HTMLElement>('#results-count')!
    const reviewSection = app.querySelector<HTMLElement>('#review-section')!
    const manager = app.querySelector<HTMLElement>('.gallery-manager')!
    const galleryActions = app.querySelector<HTMLElement>('.gallery-actions')!
    galleryActions.insertAdjacentHTML('afterbegin', '<button class="exit-gallery-trigger" type="button">Exit gallery</button>')
    const openDesk = () => { desk.hidden = false; requestAnimationFrame(() => desk.classList.add('is-open')); search.focus() }
    const closeDesk = () => { desk.classList.remove('is-open'); window.setTimeout(() => { desk.hidden = true }, 180) }
    const readWatchedMovies = () => { try { const saved = JSON.parse(localStorage.getItem('my-movie-gallery-watched') ?? '[]'); return Array.isArray(saved) ? saved : [] } catch { return [] } }
    const renderManager = () => {
      const watchedMovies = readWatchedMovies()
      manager.innerHTML = `<div class="desk-header"><div><p class="eyebrow">Your collection</p><h2 id="manager-title">Manage gallery</h2></div><button class="manager-close" type="button" aria-label="Close gallery manager">×</button></div><p class="manager-intro">Films you add live here. Removing one also takes its exhibit out of the walkthrough.</p><div class="managed-film-list">${watchedMovies.length ? watchedMovies.map((movie: { id: string; title: string; releaseYear: number; rating: number; posterUrl: string }) => `<article class="managed-film"><img src="${escapeHtml(movie.posterUrl)}" alt=""/><div><h3>${escapeHtml(movie.title)}</h3><p>${movie.releaseYear} · ${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}</p></div><button class="remove-film" type="button" data-remove-id="${escapeHtml(movie.id)}">Remove</button></article>`).join('') : '<p class="empty-collection">Your saved films will appear here.</p>'}</div>`
      manager.hidden = false
      requestAnimationFrame(() => manager.classList.add('is-open'))
    }
    const closeManager = () => { manager.classList.remove('is-open'); window.setTimeout(() => { manager.hidden = true }, 180) }
    const renderResults = () => { const term = search.value.trim().toLowerCase(); const matches = catalog.filter((movie) => movie.title.toLowerCase().includes(term)).slice(0, 6); resultsSection.hidden = !term; if (!term) return; resultsCount.textContent = `${matches.length} ${matches.length === 1 ? 'title' : 'titles'}`; results.innerHTML = matches.map((movie) => `<button class="movie-tile ${selectedMovie?.tmdbId === movie.tmdbId ? 'is-selected' : ''}" type="button" data-tmdb-id="${movie.tmdbId}" role="option" aria-selected="${selectedMovie?.tmdbId === movie.tmdbId}"><span class="movie-poster" style="--poster-tone:${movie.posterTone}; --poster-accent:${movie.posterAccent}" aria-hidden="true"><span>${movie.title.slice(0, 1)}</span></span><span class="movie-title">${movie.title}</span><span class="movie-year">${movie.releaseYear}</span></button>`).join('') || '<p class="no-results">No titles found. Try another search.</p>' }
    const renderReview = () => { reviewSection.hidden = !selectedMovie; if (!selectedMovie) return; const movie = selectedMovie; reviewSection.innerHTML = `<article class="review-card"><div class="review-poster movie-poster" style="--poster-tone:${movie.posterTone}; --poster-accent:${movie.posterAccent}" aria-hidden="true"><span>${movie.title.slice(0, 1)}</span></div><div class="review-content"><div class="review-heading"><div><p class="eyebrow">Your selection</p><h3 id="review-title">${movie.title}</h3><p>${movie.releaseYear}</p></div><button class="change-movie" type="button">Change</button></div><fieldset class="rating-fieldset"><legend>Your rating</legend><div class="rating-buttons" role="radiogroup" aria-label="Rating for ${movie.title}">${[1, 2, 3, 4, 5].map((value) => `<button class="rating-button ${value <= rating ? 'is-active' : ''}" type="button" data-rating="${value}" role="radio" aria-checked="${value === rating}" aria-label="${value} out of 5">★</button>`).join('')}<span class="rating-value">${rating ? `${rating} / 5` : 'Choose a rating'}</span></div></fieldset><label class="thought-field" for="post-credit-thought">Post-credit thoughts <span>${thought.length}/140</span></label><textarea id="post-credit-thought" maxlength="140" placeholder="What stayed with you after the credits?">${escapeHtml(thought)}</textarea><button class="add-gallery" type="button">Add to gallery</button><p class="save-message" id="save-message" aria-live="polite"></p></div></article>` }
    app.querySelector('.add-film-trigger')?.addEventListener('click', openDesk); app.querySelector('.manage-gallery-trigger')?.addEventListener('click', renderManager); app.querySelector('.desk-close')?.addEventListener('click', closeDesk); app.querySelector('.wordmark')?.addEventListener('click', renderEntrance); search.addEventListener('input', renderResults); search.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDesk() })
    app.addEventListener('click', (event) => { const target = event.target as HTMLElement; if (target.closest('.exit-gallery-trigger')) { renderEntrance(); return }; if (target.closest('.manager-close')) { closeManager(); return }; const removeButton = target.closest<HTMLButtonElement>('[data-remove-id]'); if (removeButton) { const id = removeButton.dataset.removeId!; const saved = readWatchedMovies().filter((movie: { id: string }) => movie.id !== id); localStorage.setItem('my-movie-gallery-watched', JSON.stringify(saved)); window.dispatchEvent(new CustomEvent('gallery:remove-watched-movie', { detail: { id } })); renderManager(); return }; const movieButton = target.closest<HTMLButtonElement>('[data-tmdb-id]'); if (movieButton) { selectedMovie = catalog.find((movie) => movie.tmdbId === Number(movieButton.dataset.tmdbId)) ?? null; rating = 0; thought = ''; renderResults(); renderReview(); return }; const ratingButton = target.closest<HTMLButtonElement>('[data-rating]'); if (ratingButton) { rating = Number(ratingButton.dataset.rating); renderReview(); return }; if (target.closest('.change-movie')) { selectedMovie = null; renderResults(); renderReview(); search.focus(); return }; if (target.closest('.add-gallery') && selectedMovie) { const message = reviewSection.querySelector<HTMLElement>('#save-message')!; if (!rating) { message.textContent = 'Choose a star rating before placing this film in the gallery.'; return }; const watchedMovie = { id: crypto.randomUUID(), title: selectedMovie.title, releaseYear: selectedMovie.releaseYear, posterUrl: selectedMovie.posterUrl, rating, thought }; try { const existing = readWatchedMovies(); localStorage.setItem('my-movie-gallery-watched', JSON.stringify([watchedMovie, ...existing])); } catch { /* The live exhibition still updates if storage is unavailable. */ } window.dispatchEvent(new CustomEvent('gallery:add-watched-movie', { detail: watchedMovie })); message.textContent = `${selectedMovie.title} has been hung in your gallery.`; target.closest<HTMLButtonElement>('.add-gallery')!.disabled = true } })
    app.addEventListener('input', (event) => { const target = event.target as HTMLTextAreaElement; if (target.id !== 'post-credit-thought') return; thought = target.value; const label = reviewSection.querySelector<HTMLElement>('.thought-field span'); if (label) label.textContent = `${thought.length}/140` })
  }
  // Retained for the collection-management flow; the entry CTA now hands off to the dedicated walkthrough.
  void renderGallery
  if (galleryName) updateTitle(galleryName)
  renderEntrance()
}
