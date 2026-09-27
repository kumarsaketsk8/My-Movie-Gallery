import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { isTmdbConfigured, posterUrl, searchMovies } from './lib/tmdb'
import './rectangular-walkthrough.css'

type CatalogMovie = { id: string; title: string; year: number; posterUrl: string; tone: string; accent: string }
type MovieAssignment = CatalogMovie & { rating: number; note: string; slotId: string }
type CanvasSlot = { id: string; order: number; center: THREE.Vector3; size: THREE.Vector3; width: number; height: number; depth: number }
type Presentation = { group: THREE.Group; light: THREE.SpotLight; target: THREE.Object3D }
type GalleryTheme = {
  version: 1
  background: string
  fog: string
  wall: string
  carpetTint: string
  boardTint: string
  curtainTint: string
  ambientIntensity: number
  ceilingLightIntensity: number
  entryGlowIntensity: number
  exposure: number
}

const starterCatalog: CatalogMovie[] = [
  { id: 'inception', title: 'Inception', year: 2010, posterUrl: 'https://image.tmdb.org/t/p/w780/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', tone: '#213747', accent: '#d9b77e' },
  { id: 'dark-knight', title: 'The Dark Knight', year: 2008, posterUrl: 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg', tone: '#17232e', accent: '#bd6c54' },
  { id: 'godfather', title: 'The Godfather', year: 1972, posterUrl: 'https://image.tmdb.org/t/p/w780/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', tone: '#54372d', accent: '#ddbd8e' },
  { id: 'interstellar', title: 'Interstellar', year: 2014, posterUrl: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', tone: '#263f52', accent: '#e9c479' },
  { id: 'dilwale', title: 'Dilwale Dulhania Le Jayenge', year: 1995, posterUrl: 'https://image.tmdb.org/t/p/w780/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', tone: '#74282d', accent: '#e7b35e' },
  { id: 'spirited-away', title: 'Spirited Away', year: 2001, posterUrl: 'https://image.tmdb.org/t/p/w780/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', tone: '#4b7065', accent: '#f1c972' },
  { id: 'parasite', title: 'Parasite', year: 2019, posterUrl: 'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', tone: '#50635c', accent: '#b9d6c3' },
  { id: 'la-la-land', title: 'La La Land', year: 2016, posterUrl: 'https://image.tmdb.org/t/p/w780/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg', tone: '#244567', accent: '#f1a85b' },
]
let catalog = [...starterCatalog]
let tmdbSearchPending = false
let tmdbSearchError = ''
let tmdbSearchController: AbortController | null = null
let tmdbSearchTimer = 0

// This is the user-supplied route plan.  A movie always fills the first empty
// canvas in this list; it never depends on camera position or mesh traversal order.
const canvasRoute = [
  'West board 1', 'West board 2', 'Divider board west', 'Cross-wall south board 1', 'West board 3',
  'North board 1', 'North board 2', 'North board 3', 'North board 4', 'Cross-wall north board',
  'East board 3', 'Cross-wall south board 2', 'East board 2', 'Divider board east', 'East board 1',
]

const storageKey = 'rectangular-gallery-movie-list-v1'
const galleryNameStorageKey = 'my-movie-gallery-name'
const defaultTheme: GalleryTheme = {
  version: 1,
  background: '#090506',
  fog: '#090506',
  wall: '#160d0e',
  carpetTint: '#ffffff',
  boardTint: '#ffffff',
  curtainTint: '#ffffff',
  ambientIntensity: 1.05,
  ceilingLightIntensity: 15,
  entryGlowIntensity: 34,
  exposure: 1.35,
}
const query = new URLSearchParams(window.location.search)
const shareId = query.get('share')
const editId = query.get('edit')
const viewerMode = Boolean(shareId) && !editId
const normaliseGalleryName = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 50)
const nameFromEntry = normaliseGalleryName(query.get('gallery') ?? '')
let galleryName = nameFromEntry || normaliseGalleryName(localStorage.getItem(galleryNameStorageKey) ?? '') || 'My Movie Gallery'
if (nameFromEntry) localStorage.setItem(galleryNameStorageKey, nameFromEntry)
const readAssignments = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(stored) ? stored.filter((item): item is MovieAssignment => Boolean(item?.id && item?.slotId)) : []
  } catch { return [] as MovieAssignment[] }
}
let assignments = readAssignments()
let galleryTheme: GalleryTheme = { ...defaultTheme }
const saveAssignments = () => {
  if (viewerMode) return
  localStorage.setItem(storageKey, JSON.stringify(assignments))
  if (editId) void savePrivateGallery()
}

const canvas = document.querySelector<HTMLCanvasElement>('#gallery-canvas')!
const status = document.querySelector<HTMLElement>('#walkthrough-status')!
const trigger = document.querySelector<HTMLButtonElement>('#movie-list-trigger')!
const exitReturn = document.querySelector<HTMLAnchorElement>('#exit-return')!
const panel = document.querySelector<HTMLElement>('#movie-list-panel')!
const closePanelButton = document.querySelector<HTMLButtonElement>('#movie-list-close')!
const emptyState = document.querySelector<HTMLElement>('#movie-list-empty')!
const search = document.querySelector<HTMLInputElement>('#movie-list-search')!
const results = document.querySelector<HTMLElement>('#movie-search-results')!
const selection = document.querySelector<HTMLElement>('#movie-selection')!
const capacity = document.querySelector<HTMLElement>('#movie-list-capacity')!
const shareTrigger = document.querySelector<HTMLButtonElement>('#share-gallery-trigger')!
const sharePanel = document.querySelector<HTMLElement>('#share-gallery-panel')!
const shareClose = document.querySelector<HTMLButtonElement>('#share-gallery-close')!
const shareSave = document.querySelector<HTMLButtonElement>('#share-gallery-save')!
const shareName = document.querySelector<HTMLElement>('#share-gallery-name')!
const shareMessage = document.querySelector<HTMLElement>('#share-gallery-message')!
const shareLinkRow = document.querySelector<HTMLElement>('#share-gallery-link-row')!
const shareLink = document.querySelector<HTMLInputElement>('#share-gallery-link')!
const shareCopy = document.querySelector<HTMLButtonElement>('#share-gallery-copy')!
const privateLink = document.querySelector<HTMLInputElement>('#private-gallery-link')!
const privateCopy = document.querySelector<HTMLButtonElement>('#private-gallery-copy')!

function updateGalleryIdentity(name: string) {
  galleryName = normaliseGalleryName(name) || 'My Movie Gallery'
  document.title = `${galleryName} · Movie Gallery`
  const entry = new URL('/', window.location.origin)
  entry.searchParams.set('gallery', galleryName)
  exitReturn.href = entry.toString()
  shareName.textContent = galleryName
}

const scene = new THREE.Scene()
scene.background = new THREE.Color('#090506')
scene.fog = new THREE.Fog('#090506', 20, 58)
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .05, 120)
camera.rotation.order = 'YXZ'
camera.position.set(-4, 3.15, 14.6)
camera.lookAt(-4, 3.05, -4)
let yaw = camera.rotation.y
let pitch = camera.rotation.x
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
renderer.setSize(innerWidth, innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = defaultTheme.exposure

const ambientLight = new THREE.HemisphereLight('#d8a779', '#080305', defaultTheme.ambientIntensity)
scene.add(ambientLight)
const ceilingLights: THREE.PointLight[] = []
for (const x of [-7.5, 0, 7.5]) for (const z of [-13, -9, -5, -1, 3, 7, 11, 15]) {
  const light = new THREE.PointLight('#ffb36b', defaultTheme.ceilingLightIntensity, 12, 2)
  light.position.set(x, 8.9, z)
  ceilingLights.push(light)
  scene.add(light)
}
const entryGlow = new THREE.PointLight('#d44a20', defaultTheme.entryGlowIntensity, 16, 2)
entryGlow.position.set(-4, 4.5, 11)
scene.add(entryGlow)

updateGalleryIdentity(galleryName)

function wovenTexture(base: [number, number, number], variance: number, repeatX: number, repeatY: number) {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = textureCanvas.height = 512
  const context = textureCanvas.getContext('2d')!
  const image = context.createImageData(512, 512)
  let seed = 918273
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let index = 0; index < image.data.length; index += 4) {
    const weave = (random() - .5) * variance + (index / 4 % 7 === 0 ? variance * .12 : 0)
    image.data[index] = Math.max(0, Math.min(255, base[0] + weave))
    image.data[index + 1] = Math.max(0, Math.min(255, base[1] + weave * .16))
    image.data[index + 2] = Math.max(0, Math.min(255, base[2] + weave * .12))
    image.data[index + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return texture
}

function haloTexture() {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = textureCanvas.height = 256
  const context = textureCanvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 180, 80, .78)')
  gradient.addColorStop(.42, 'rgba(238, 84, 34, .23)')
  gradient.addColorStop(1, 'rgba(238, 40, 24, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const carpetMaterial = new THREE.MeshStandardMaterial({ map: wovenTexture([112, 5, 13], 34, 11, 15), roughness: .92, metalness: 0 })
const boardMaterial = new THREE.MeshStandardMaterial({ map: wovenTexture([128, 6, 14], 40, 7, 9), roughness: .84, metalness: 0 })
const curtainMaterial = new THREE.MeshStandardMaterial({ map: wovenTexture([114, 3, 13], 42, 8, 11), roughness: .9, metalness: 0 })
const wallMaterial = new THREE.MeshStandardMaterial({ color: '#160d0e', roughness: .72, metalness: .1 })
const frameMaterial = new THREE.MeshStandardMaterial({ color: '#120d0c', metalness: .82, roughness: .23 })
const brassMaterial = new THREE.MeshStandardMaterial({ color: '#7e4d1d', metalness: .9, roughness: .28 })
const backingMaterial = new THREE.MeshStandardMaterial({ color: '#210b0b', metalness: .26, roughness: .46 })
const haloMaterial = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, opacity: .64, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })

function isThemeColour(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}
function themeNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback
}
function sanitiseTheme(value: unknown): GalleryTheme {
  const supplied = value && typeof value === 'object' ? value as Partial<GalleryTheme> : {}
  return {
    version: 1,
    background: isThemeColour(supplied.background) ? supplied.background : defaultTheme.background,
    fog: isThemeColour(supplied.fog) ? supplied.fog : defaultTheme.fog,
    wall: isThemeColour(supplied.wall) ? supplied.wall : defaultTheme.wall,
    carpetTint: isThemeColour(supplied.carpetTint) ? supplied.carpetTint : defaultTheme.carpetTint,
    boardTint: isThemeColour(supplied.boardTint) ? supplied.boardTint : defaultTheme.boardTint,
    curtainTint: isThemeColour(supplied.curtainTint) ? supplied.curtainTint : defaultTheme.curtainTint,
    ambientIntensity: themeNumber(supplied.ambientIntensity, defaultTheme.ambientIntensity, 0, 4),
    ceilingLightIntensity: themeNumber(supplied.ceilingLightIntensity, defaultTheme.ceilingLightIntensity, 0, 60),
    entryGlowIntensity: themeNumber(supplied.entryGlowIntensity, defaultTheme.entryGlowIntensity, 0, 100),
    exposure: themeNumber(supplied.exposure, defaultTheme.exposure, .3, 3),
  }
}
function applyTheme(theme: GalleryTheme) {
  galleryTheme = sanitiseTheme(theme)
  scene.background = new THREE.Color(galleryTheme.background)
  if (scene.fog) scene.fog.color.set(galleryTheme.fog)
  wallMaterial.color.set(galleryTheme.wall)
  carpetMaterial.color.set(galleryTheme.carpetTint)
  boardMaterial.color.set(galleryTheme.boardTint)
  curtainMaterial.color.set(galleryTheme.curtainTint)
  ambientLight.intensity = galleryTheme.ambientIntensity
  ceilingLights.forEach((light) => { light.intensity = galleryTheme.ceilingLightIntensity })
  entryGlow.intensity = galleryTheme.entryGlowIntensity
  renderer.toneMappingExposure = galleryTheme.exposure
}
applyTheme(defaultTheme)

let loaded = false
let canvasSlots: CanvasSlot[] = []
let presentations: Presentation[] = []
let selectedMovie: CatalogMovie | null = null
let selectedRating = 0
let selectedNote = ''
const posterTextures = new Map<string, THREE.Texture>()
const posterLoader = new THREE.TextureLoader()

function textureUrl(posterUrl: string) {
  // Galleries saved before the poster proxy was added contain direct TMDB URLs.
  // Rewrite those legacy URLs so their real posters also work as WebGL textures.
  const match = posterUrl.match(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp))$/i)
  return match ? `/api/tmdb-poster?path=${encodeURIComponent(match[1])}` : posterUrl
}

function posterFallback(movie: CatalogMovie) {
  const posterCanvas = document.createElement('canvas')
  posterCanvas.width = 600
  posterCanvas.height = 900
  const context = posterCanvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 600, 900)
  gradient.addColorStop(0, movie.accent)
  gradient.addColorStop(.34, movie.tone)
  gradient.addColorStop(1, '#100b0b')
  context.fillStyle = gradient
  context.fillRect(0, 0, 600, 900)
  context.strokeStyle = 'rgba(255, 236, 196, .76)'
  context.lineWidth = 6
  context.strokeRect(34, 34, 532, 832)
  context.fillStyle = '#fff2d7'
  context.font = '700 52px Georgia'
  context.textAlign = 'center'
  context.fillText(movie.title.toUpperCase(), 300, 746, 480)
  context.font = '700 24px Arial'
  context.fillStyle = movie.accent
  context.fillText(String(movie.year), 300, 790)
  const texture = new THREE.CanvasTexture(posterCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return texture
}

function textureFor(movie: CatalogMovie) {
  const existing = posterTextures.get(movie.id)
  if (existing) return existing
  const fallback = posterFallback(movie)
  posterTextures.set(movie.id, fallback)
  posterLoader.load(textureUrl(movie.posterUrl), (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    posterTextures.set(movie.id, texture)
    presentations.forEach(({ group }) => {
      if (group.userData.movieId !== movie.id) return
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.posterMaterial) {
          const material = child.material as THREE.MeshBasicMaterial
          material.map = texture
          material.needsUpdate = true
        }
      })
    })
  })
  return fallback
}

function createPresentation(slot: CanvasSlot, assignment: MovieAssignment): Presentation {
  // The narrow horizontal dimension is the board thickness; its normal is the display face.
  // (The previous comparison used the broad dimension, which mounted frames on board edges.)
  const thinIsX = slot.size.x < slot.size.z
  const sign = thinIsX ? (slot.center.x < 0 ? 1 : -1) : (slot.center.z < 0 ? 1 : -1)
  const normal = new THREE.Vector3(thinIsX ? sign : 0, 0, thinIsX ? 0 : sign)
  const group = new THREE.Group()
  group.name = `Framed poster · ${assignment.title}`
  group.userData.movieId = assignment.id
  group.position.copy(slot.center).addScaledVector(normal, slot.depth / 2 + .035)
  if (thinIsX) group.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2
  else group.rotation.y = sign > 0 ? 0 : Math.PI
  const posterWidth = Math.min(slot.width * .74, slot.height * .78 * (2 / 3))
  const posterHeight = posterWidth / (2 / 3)
  const frameWidth = posterWidth + .28
  const frameHeight = posterHeight + .28
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(frameWidth * 1.55, frameHeight * 1.5), haloMaterial)
  halo.position.z = -.025
  group.add(halo)
  const backing = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, .075), backingMaterial)
  backing.position.z = .025
  group.add(backing)
  const addFrameBar = (width: number, height: number, x: number, y: number, material: THREE.Material) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, .105), material)
    bar.position.set(x, y, .095)
    group.add(bar)
  }
  const border = .105
  addFrameBar(frameWidth, border, 0, frameHeight / 2 - border / 2, frameMaterial)
  addFrameBar(frameWidth, border, 0, -frameHeight / 2 + border / 2, frameMaterial)
  addFrameBar(border, frameHeight, -frameWidth / 2 + border / 2, 0, frameMaterial)
  addFrameBar(border, frameHeight, frameWidth / 2 - border / 2, 0, frameMaterial)
  const brassEdge = .022
  addFrameBar(frameWidth - border * .55, brassEdge, 0, frameHeight / 2 - border * 1.1, brassMaterial)
  addFrameBar(frameWidth - border * .55, brassEdge, 0, -frameHeight / 2 + border * 1.1, brassMaterial)
  addFrameBar(brassEdge, frameHeight - border * .55, -frameWidth / 2 + border * 1.1, 0, brassMaterial)
  addFrameBar(brassEdge, frameHeight - border * .55, frameWidth / 2 - border * 1.1, 0, brassMaterial)
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(posterWidth, posterHeight), new THREE.MeshBasicMaterial({ map: textureFor(assignment), side: THREE.DoubleSide }))
  poster.name = `Poster · ${assignment.title}`
  poster.userData.posterMaterial = true
  poster.position.z = .155
  group.add(poster)
  scene.add(group)
  const light = new THREE.SpotLight('#ffc58b', 4.4, 6.5, .52, .9, 1.6)
  light.position.copy(group.position).addScaledVector(normal, 2.3).add(new THREE.Vector3(0, 2.0, 0))
  const target = new THREE.Object3D()
  target.position.copy(group.position).add(new THREE.Vector3(0, -.15, 0))
  light.target = target
  scene.add(light, target)
  return { group, light, target }
}

function refreshPresentations() {
  presentations.forEach(({ group, light, target }) => scene.remove(group, light, target))
  presentations = []
  const bySlot = new Map(assignments.map((assignment) => [assignment.slotId, assignment]))
  canvasSlots.forEach((slot) => {
    const assignment = bySlot.get(slot.id)
    if (assignment) presentations.push(createPresentation(slot, assignment))
  })
}

function nextAvailableSlot() {
  const occupied = new Set(assignments.map((assignment) => assignment.slotId))
  return canvasSlots.find((slot) => !occupied.has(slot.id))
}

function alignAssignmentsToRoute() {
  const available = [...canvasSlots]
  const claimed = new Set<string>()
  assignments = assignments.flatMap((assignment) => {
    const existing = canvasSlots.find((slot) => slot.id === assignment.slotId)
    const slot = existing && !claimed.has(existing.id) ? existing : available.find((candidate) => !claimed.has(candidate.id))
    if (!slot) return []
    claimed.add(slot.id)
    return [{ ...assignment, slotId: slot.id }]
  })
  saveAssignments()
}

function renderPanel() {
  const occupiedCount = assignments.filter((assignment) => canvasSlots.some((slot) => slot.id === assignment.slotId)).length
  emptyState.hidden = occupiedCount > 0
  const term = search.value.trim().toLowerCase()
  const matchingMovies = term ? catalog : starterCatalog
  const assignedIds = new Set(assignments.map((assignment) => assignment.id))
  results.innerHTML = tmdbSearchPending
    ? '<p class="movie-list-empty">Searching TMDB…</p>'
    : tmdbSearchError
      ? `<p class="movie-list-empty">${tmdbSearchError}</p>`
      : matchingMovies.length
    ? matchingMovies.map((movie) => `<button class="movie-result ${selectedMovie?.id === movie.id ? 'is-selected' : ''} ${assignedIds.has(movie.id) ? 'is-added' : ''}" type="button" data-movie-id="${movie.id}" ${assignedIds.has(movie.id) ? 'data-list-action="remove"' : ''}><img class="movie-result-poster" src="${movie.posterUrl}" alt=""><span class="movie-result-copy"><strong>${movie.title}</strong><span>${movie.year || 'Year unavailable'}</span></span><span class="movie-result-state">${assignedIds.has(movie.id) ? 'Remove' : 'Select'}</span></button>`).join('')
    : '<p class="movie-list-empty">No films found. Try another title.</p>'
  if (!selectedMovie) selection.hidden = true
  else {
    selection.hidden = false
    selection.innerHTML = `<div class="selection-film"><img class="selected-movie-poster" src="${selectedMovie.posterUrl}" alt=""><div><h3>${selectedMovie.title}</h3><p>${selectedMovie.year || 'Year unavailable'} · Ready for the next red canvas</p></div></div><label class="rating-label">Your rating</label><div class="rating-controls" role="radiogroup" aria-label="Rating for ${selectedMovie.title}">${[1, 2, 3, 4, 5].map((rating) => `<button class="rating-button ${rating <= selectedRating ? 'is-active' : ''}" type="button" data-rating="${rating}" role="radio" aria-checked="${rating === selectedRating}" aria-label="${rating} out of 5">★</button>`).join('')}</div><label class="movie-note-label" for="movie-note">Short note <span>optional</span></label><textarea id="movie-note" class="movie-note" maxlength="160" placeholder="What stayed with you after the credits?">${selectedNote}</textarea><button class="add-movie-button" type="button" ${selectedRating ? '' : 'disabled'}>Add to gallery</button>`
  }
  capacity.textContent = canvasSlots.length ? `${occupiedCount} of ${canvasSlots.length} display canvases occupied` : 'Preparing display canvases…'
}

function filmColors(id: number) {
  const hue = Math.abs(id * 47) % 360
  return { tone: `hsl(${hue} 28% 25%)`, accent: `hsl(${hue} 58% 68%)` }
}
function fallbackPoster() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278" viewBox="0 0 185 278"%3E%3Crect width="185" height="278" fill="%23291416"/%3E%3C/svg%3E'
}
async function searchTmdbMovies() {
  const term = search.value.trim()
  window.clearTimeout(tmdbSearchTimer)
  tmdbSearchController?.abort()
  if (!term) {
    catalog = [...starterCatalog]
    tmdbSearchPending = false
    tmdbSearchError = ''
    renderPanel()
    return
  }
  if (!isTmdbConfigured) {
    catalog = []
    tmdbSearchPending = false
    tmdbSearchError = 'Add VITE_TMDB_API_KEY in Vercel, then redeploy to search TMDB.'
    renderPanel()
    return
  }
  tmdbSearchPending = true
  tmdbSearchError = ''
  renderPanel()
  tmdbSearchTimer = window.setTimeout(async () => {
    const controller = new AbortController()
    tmdbSearchController = controller
    try {
      const movies = await searchMovies(term, controller.signal)
      if (controller.signal.aborted) return
      catalog = movies.map((movie) => ({
        id: `tmdb-${movie.tmdbId}`,
        title: movie.title,
        year: movie.releaseYear ?? 0,
        posterUrl: posterUrl(movie.posterPath) ?? fallbackPoster(),
        ...filmColors(movie.tmdbId),
      }))
    } catch (error) {
      if (controller.signal.aborted) return
      catalog = []
      tmdbSearchError = error instanceof Error ? `${error.message} Try again.` : 'TMDB search could not be completed. Try again.'
    } finally {
      if (!controller.signal.aborted) {
        tmdbSearchPending = false
        renderPanel()
      }
    }
  }, 300)
}

function addSelectedMovie() {
  if (!selectedMovie || !selectedRating) return
  const slot = nextAvailableSlot()
  if (!slot) { capacity.textContent = 'Every display canvas is occupied. Remove a title before adding another.'; return }
  assignments.push({ ...selectedMovie, rating: selectedRating, note: selectedNote.trim(), slotId: slot.id })
  saveAssignments()
  selectedMovie = null
  selectedRating = 0
  selectedNote = ''
  refreshPresentations()
  renderPanel()
}

function openPanel() {
  panel.hidden = false
  panel.setAttribute('aria-hidden', 'false')
  requestAnimationFrame(() => panel.classList.add('is-open'))
  renderPanel()
  search.focus()
}
function closePanel() {
  panel.classList.remove('is-open')
  panel.setAttribute('aria-hidden', 'true')
  window.setTimeout(() => { panel.hidden = true }, 200)
}

function openSharePanel() {
  sharePanel.hidden = false
  sharePanel.setAttribute('aria-hidden', 'false')
  shareName.textContent = galleryName
  shareMessage.textContent = ''
  requestAnimationFrame(() => sharePanel.classList.add('is-open'))
}
function closeSharePanel() {
  sharePanel.classList.remove('is-open')
  sharePanel.setAttribute('aria-hidden', 'true')
  window.setTimeout(() => { sharePanel.hidden = true }, 200)
}
function publicShareUrl(id: string) {
  const url = new URL('/rectangular-gallery.html', window.location.href)
  url.searchParams.set('share', id)
  return url.toString()
}
function privateEditUrl(id: string) {
  const url = new URL('/rectangular-gallery.html', window.location.href)
  url.searchParams.set('edit', id)
  return url.toString()
}
async function saveAndShareGallery() {
  if (!supabase || !isSupabaseConfigured) {
    shareMessage.textContent = 'Sharing is not configured for this gallery yet.'
    return
  }
  shareSave.disabled = true
  shareSave.textContent = 'Creating links…'
  shareMessage.textContent = ''
  shareLinkRow.hidden = true
  const { data, error } = await supabase.rpc('create_gallery_links', {
    p_gallery_name: galleryName,
    p_assignments: assignments,
    p_theme: galleryTheme,
  })
  shareSave.disabled = false
  shareSave.textContent = 'Create private and shared links'
  const record = Array.isArray(data) ? data[0] : data
  if (error || !record || typeof record.edit_id !== 'string' || typeof record.share_id !== 'string') {
    shareMessage.textContent = 'Sharing needs the private gallery links migration before links can be created.'
    return
  }
  privateLink.value = privateEditUrl(record.edit_id)
  shareLink.value = publicShareUrl(record.share_id)
  shareLinkRow.hidden = false
  shareMessage.textContent = 'Both links are ready. The private link can edit; the shared link is view-only.'
}
async function copyLink(input: HTMLInputElement, button: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(input.value)
    button.textContent = 'Copied'
    window.setTimeout(() => { button.textContent = 'Copy' }, 1600)
  } catch {
    input.focus()
    input.select()
    shareMessage.textContent = 'Copy the selected link to share this gallery.'
  }
}
async function savePrivateGallery() {
  if (!editId || !supabase || !isSupabaseConfigured) return
  const { error } = await supabase.rpc('update_gallery_edit', {
    p_edit_id: editId,
    p_gallery_name: galleryName,
    p_assignments: assignments,
    p_theme: galleryTheme,
  })
  if (error) status.textContent = 'Your private gallery could not be saved. Check your connection and try again.'
}
function isMovieAssignment(value: unknown): value is MovieAssignment {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<MovieAssignment>
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.year === 'number'
    && typeof item.posterUrl === 'string' && typeof item.rating === 'number' && typeof item.slotId === 'string'
}
async function loadSharedGallery() {
  if (!viewerMode || !shareId) return
  document.body.classList.add('is-view-only')
  if (!supabase || !isSupabaseConfigured) {
    status.textContent = 'This shared gallery is not available right now.'
    return
  }
  const { data, error } = await supabase.rpc('read_gallery_share_v2', { p_share_id: shareId })
  const record = Array.isArray(data) ? data[0] : data
  if (error || !record || typeof record.gallery_name !== 'string' || !Array.isArray(record.assignments)) {
    status.textContent = 'This shared gallery link is unavailable.'
    return
  }
  assignments = record.assignments.filter(isMovieAssignment)
  applyTheme(sanitiseTheme(record.theme))
  updateGalleryIdentity(record.gallery_name)
  if (canvasSlots.length) {
    alignAssignmentsToRoute()
    refreshPresentations()
    renderPanel()
  }
  status.textContent = `Viewing ${galleryName}`
}
async function loadPrivateGallery() {
  if (!editId) return
  if (!supabase || !isSupabaseConfigured) {
    status.textContent = 'This private gallery is not available right now.'
    return
  }
  const { data, error } = await supabase.rpc('read_gallery_edit', { p_edit_id: editId })
  const record = Array.isArray(data) ? data[0] : data
  if (error || !record || typeof record.gallery_name !== 'string' || !Array.isArray(record.assignments)) {
    status.textContent = 'This private gallery link is unavailable.'
    return
  }
  assignments = record.assignments.filter(isMovieAssignment)
  applyTheme(sanitiseTheme(record.theme))
  updateGalleryIdentity(record.gallery_name)
  if (canvasSlots.length) {
    alignAssignmentsToRoute()
    refreshPresentations()
    renderPanel()
  }
  status.textContent = `Editing ${galleryName}`
}

trigger.addEventListener('click', openPanel)
closePanelButton.addEventListener('click', closePanel)
search.addEventListener('input', () => { void searchTmdbMovies() })
panel.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const movieButton = target.closest<HTMLButtonElement>('[data-movie-id]')
  if (movieButton) {
    if (movieButton.dataset.listAction === 'remove') {
      assignments = assignments.filter((assignment) => assignment.id !== movieButton.dataset.movieId)
      saveAssignments()
      refreshPresentations()
      renderPanel()
      return
    }
    selectedMovie = catalog.find((movie) => movie.id === movieButton.dataset.movieId) ?? null
    selectedRating = 0
    selectedNote = ''
    renderPanel()
    return
  }
  const ratingButton = target.closest<HTMLButtonElement>('[data-rating]')
  if (ratingButton) { selectedRating = Number(ratingButton.dataset.rating); renderPanel(); return }
  if (target.closest('.add-movie-button')) addSelectedMovie()
})
panel.addEventListener('input', (event) => { const target = event.target as HTMLTextAreaElement; if (target.id === 'movie-note') selectedNote = target.value })
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) closePanel() })
shareTrigger.addEventListener('click', openSharePanel)
shareClose.addEventListener('click', closeSharePanel)
shareSave.addEventListener('click', () => { void saveAndShareGallery() })
shareCopy.addEventListener('click', () => { void copyLink(shareLink, shareCopy) })
privateCopy.addEventListener('click', () => { void copyLink(privateLink, privateCopy) })
void loadSharedGallery()
void loadPrivateGallery()

new GLTFLoader().load('/rectangular-plan-gallery.glb', (gltf) => {
  const candidates = new Map<string, THREE.Mesh>()
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = false
    object.receiveShadow = false
    object.frustumCulled = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const materialName = materials[0]?.name.toLowerCase() ?? ''
    if (materialName.includes('red velvet carpet')) object.material = carpetMaterial
    else if (materialName.includes('deep red velvet curtains')) object.material = curtainMaterial
    else if (materialName.includes('red display-board')) {
      object.material = boardMaterial
      const slotName = typeof object.userData.canvas_slot_name === 'string'
        ? object.userData.canvas_slot_name
        : object.name
      candidates.set(slotName, object)
    }
    else if (materialName.includes('warm black gallery') || materialName.includes('charcoal architecture')) object.material = wallMaterial
    materials.forEach((material) => { if ('envMapIntensity' in material) material.envMapIntensity = .45 })
  })
  scene.add(gltf.scene)
  canvasSlots = canvasRoute.flatMap((canvasName, index) => {
    const mesh = candidates.get(canvasName)
    if (!mesh) return []
    const bounds = new THREE.Box3().setFromObject(mesh)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    return [{ id: canvasName, order: index + 1, center, size, width: Math.max(size.x, size.z), height: size.y, depth: Math.min(size.x, size.z) }]
  })
  alignAssignmentsToRoute()
  refreshPresentations()
  renderPanel()
  loaded = true
  status.textContent = viewerMode ? `Viewing ${galleryName}` : 'Click and drag to look · WASD to explore'
}, undefined, () => { status.textContent = 'The gallery model could not be loaded. Reload to try again.' })

const held = new Set<string>()
const walkKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
  if (!walkKeys.includes(event.code)) return
  event.preventDefault()
  held.add(event.code)
})
window.addEventListener('keyup', (event) => held.delete(event.code))
window.addEventListener('blur', () => held.clear())

let dragging = false
let lastPointer = { x: 0, y: 0 }

function applyLook(deltaX: number, deltaY: number) {
  yaw -= deltaX * .004
  pitch = THREE.MathUtils.clamp(pitch - deltaY * .003, -1.1, 1.1)
  camera.rotation.set(pitch, yaw, 0)
}
canvas.addEventListener('pointerdown', (event) => {
  if (!loaded) return
  dragging = true
  lastPointer = { x: event.clientX, y: event.clientY }
  canvas.setPointerCapture(event.pointerId)
  document.body.classList.add('is-dragging')
  status.classList.add('is-hidden')
})
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return
  applyLook(event.clientX - lastPointer.x, event.clientY - lastPointer.y)
  lastPointer = { x: event.clientX, y: event.clientY }
})
function stopDragging(event: PointerEvent) {
  if (!dragging) return
  dragging = false
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  document.body.classList.remove('is-dragging')
  status.textContent = 'Click and drag to look · WASD to explore'
  status.classList.remove('is-hidden')
}
canvas.addEventListener('pointerup', stopDragging)
canvas.addEventListener('pointercancel', stopDragging)

function walkable(x: number, z: number) {
  if (x < -13.35 || x > 13.35 || z < -16.35 || z > 16.35) return false
  const centralDivider = Math.abs(x) < .48 && z > -6.85 && z < 16.85
  const crossWall = Math.abs(x) < 6.65 && z > -6.85 && z < -6.35
  return !centralDivider && !crossWall
}
function move(dx: number, dz: number) {
  const nextX = camera.position.x + dx
  if (walkable(nextX, camera.position.z)) camera.position.x = nextX
  const nextZ = camera.position.z + dz
  if (walkable(camera.position.x, nextZ)) camera.position.z = nextZ
}
let previous = performance.now()
function render(now: number) {
  const delta = Math.min(.05, Math.max(.001, (now - previous) / 1000))
  previous = now
  if (loaded) {
    const forward = Number(held.has('KeyW')) - Number(held.has('KeyS'))
    const strafe = Number(held.has('KeyD')) - Number(held.has('KeyA'))
    if (forward || strafe) {
      const length = Math.hypot(forward, strafe) || 1
      const speed = 5.8 * delta / length
      const forwardX = -Math.sin(yaw)
      const forwardZ = -Math.cos(yaw)
      const rightX = Math.cos(yaw)
      const rightZ = -Math.sin(yaw)
      move((forward * forwardX + strafe * rightX) * speed, (forward * forwardZ + strafe * rightZ) * speed)
    }
  }
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}
requestAnimationFrame(render)
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.setSize(innerWidth, innerHeight, false)
})
