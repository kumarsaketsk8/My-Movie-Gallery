import './style.css'
import { initEntryDesk } from './entry'
import { mountAgentation } from './lib/agentation'
import Lenis from 'lenis'
import gsap from 'gsap'
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

void mountAgentation()

type GalleryItem = {
  id: string
  title: string
  subtitle: string
  palette: [string, string, string]
  motif: 'eclipse' | 'curtain' | 'stairway' | 'moon' | 'spotlight'
  rating?: number
  thought?: string
  posterUrl?: string
}

const galleryItems: GalleryItem[] = [
  { id: 'red-signal', title: 'RED SIGNAL', subtitle: 'A feature presentation', palette: ['#8d1d26', '#ef6852', '#1b0809'], motif: 'eclipse' },
  { id: 'velvet-hour', title: 'VELVET HOUR', subtitle: 'Tonight at the picture house', palette: ['#3f0d22', '#bc3040', '#f4c18d'], motif: 'curtain' },
  { id: 'moonlit-reel', title: 'MOONLIT REEL', subtitle: 'An after-hours screening', palette: ['#14243c', '#8fb4dd', '#05070e'], motif: 'moon' },
  { id: 'golden-stair', title: 'GOLDEN STAIR', subtitle: 'A journey in five acts', palette: ['#3b2010', '#d59a4a', '#160b05'], motif: 'stairway' },
  { id: 'final-spotlight', title: 'FINAL SPOTLIGHT', subtitle: 'The closing presentation', palette: ['#2a1722', '#e6bd75', '#080506'], motif: 'spotlight' },
]

type WatchedMovieDetail = Omit<GalleryItem, 'subtitle' | 'palette' | 'motif'> & { releaseYear: number }
const watchedMovieStorageKey = 'my-movie-gallery-watched'

function loadWatchedMovies() {
  try {
    const saved = JSON.parse(localStorage.getItem(watchedMovieStorageKey) ?? '[]') as WatchedMovieDetail[]
    if (!Array.isArray(saved)) return
    const normalized = saved.map((movie, index) => movie.id ? movie : { ...movie, id: `legacy-${index}-${movie.title}` })
    if (normalized.some((movie, index) => movie.id !== saved[index].id)) localStorage.setItem(watchedMovieStorageKey, JSON.stringify(normalized))
    normalized.reverse().forEach((movie) => {
      galleryItems.unshift({
        id: movie.id,
        title: movie.title,
        subtitle: movie.releaseYear ? `${movie.releaseYear} · Your watched collection` : 'Your watched collection',
        palette: ['#32101a', '#d3a15a', '#110709'],
        motif: 'spotlight',
        rating: movie.rating,
        thought: movie.thought,
        posterUrl: movie.posterUrl,
      })
    })
  } catch { /* A malformed local collection should never prevent the gallery opening. */ }
}

loadWatchedMovies()

const canvas = document.querySelector<HTMLCanvasElement>('#museum')!
const blenderGalleryRender = document.querySelector<HTMLImageElement>('#blender-gallery-render')!
const app = document.querySelector<HTMLElement>('#app')!
const track = document.querySelector<HTMLDivElement>('#track')!
const darkVeil = document.querySelector<HTMLDivElement>('#dark')!
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

initEntryDesk()

const scene = new THREE.Scene()
scene.background = new THREE.Color('#10090b')
scene.fog = new THREE.Fog('#10090b', 18, 76)

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 140)
camera.rotation.order = 'YXZ'
camera.position.set(0, 2.65, 8)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
// Cap internal resolution: this is visually indistinguishable for the dark gallery,
// while avoiding expensive high-DPI fills during continuous camera movement.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
renderer.setSize(window.innerWidth, window.innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.32
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

scene.add(new THREE.HemisphereLight('#d7b08a', '#070506', 0.7))

const corridor = new THREE.Group()
scene.add(corridor)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 130),
  new THREE.MeshPhysicalMaterial({ color: '#24181b', roughness: 0.2, metalness: 0.58, clearcoat: 0.75, clearcoatRoughness: 0.18 }),
)
floor.rotation.x = -Math.PI / 2
floor.position.set(0, 0, -26)
corridor.add(floor)

const reflection = new Reflector(new THREE.PlaneGeometry(15.8, 128), {
  textureWidth: 512,
  textureHeight: 512,
  color: new THREE.Color('#2c1216'),
  clipBias: 0.004,
})
reflection.rotation.x = -Math.PI / 2
reflection.position.set(0, 0.012, -26)
const reflectionMaterial = reflection.material as THREE.ShaderMaterial
reflectionMaterial.transparent = true
reflectionMaterial.opacity = 0.42
corridor.add(reflection)

const redCarpet = new THREE.Mesh(
  new THREE.BoxGeometry(5.15, 0.055, 130),
  new THREE.MeshPhysicalMaterial({ color: '#871827', roughness: 0.7, metalness: 0.02, clearcoat: 0.12 }),
)
redCarpet.position.set(0, 0.045, -26)
redCarpet.receiveShadow = true
corridor.add(redCarpet)

const sideWallMaterial = new THREE.MeshPhysicalMaterial({ color: '#241218', roughness: 0.62, metalness: 0.16, clearcoat: 0.22, clearcoatRoughness: 0.45 })
const ceilingMaterial = new THREE.MeshStandardMaterial({ color: '#171215', roughness: 0.82, metalness: 0.12 })
for (const x of [-8, 8]) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(130, 9), sideWallMaterial)
  wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2
  wall.position.set(x, 4.5, -26)
  corridor.add(wall)
}
const panelMaterial = new THREE.MeshPhysicalMaterial({ color: '#110b0e', roughness: .48, metalness: .3, clearcoat: .16 })
for (const x of [-7.92, 7.92]) {
  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(.14, .24, 130), panelMaterial)
  baseboard.position.set(x, .22, -26)
  corridor.add(baseboard)
  for (let z = 8; z >= -88; z -= 8) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(.13, 7.7, .16), panelMaterial)
    rib.position.set(x, 4.2, z)
    corridor.add(rib)
  }
}
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 130), ceilingMaterial)
ceiling.rotation.x = Math.PI / 2
ceiling.position.set(0, 9, -26)
corridor.add(ceiling)

// Small recessed lamps preserve the reference ceiling while giving the empty walls
// enough soft, practical illumination to read as a finished gallery.
const recessedLightMaterial = new THREE.MeshBasicMaterial({ color: '#ffd991' })
for (let z = 4; z >= -80; z -= 12) {
  for (const x of [-4.7, 4.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.34), recessedLightMaterial)
    lamp.position.set(x, 8.965, z)
    corridor.add(lamp)
    const light = new THREE.PointLight('#f5c57a', 1.35, 8, 2)
    light.position.set(x, 8.6, z)
    corridor.add(light)
  }
}

const marqueeGeometry = new THREE.BoxGeometry(0.12, 0.12, 130)
for (const x of [-7.85, 7.85]) {
  const strip = new THREE.Mesh(marqueeGeometry, new THREE.MeshBasicMaterial({ color: '#6f191e' }))
  strip.position.set(x, 8.55, -26)
  corridor.add(strip)
}

const warmLight = new THREE.DirectionalLight('#ffb07c', 1.45)
warmLight.position.set(-4, 8, 5)
scene.add(warmLight)
scene.add(warmLight.target)

function createExhibitWallMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')!
  const base = context.createLinearGradient(0, 0, 512, 512)
  base.addColorStop(0, '#4b1c25')
  base.addColorStop(.52, '#2b1018')
  base.addColorStop(1, '#531c25')
  context.fillStyle = base
  context.fillRect(0, 0, 512, 512)
  context.globalAlpha = .2
  for (let x = -512; x < 1024; x += 12) {
    context.fillStyle = x % 24 === 0 ? '#c07163' : '#12070a'
    context.fillRect(x, 0, 3, 512)
  }
  for (let y = 4; y < 512; y += 8) {
    context.fillStyle = y % 16 === 4 ? '#e09a85' : '#17080b'
    context.fillRect(0, y, 512, 1)
  }
  context.globalAlpha = .11
  for (let index = 0; index < 1900; index += 1) {
    const tone = 35 + Math.floor(Math.random() * 105)
    context.fillStyle = `rgb(${tone + 45}, ${tone}, ${tone + 7})`
    context.fillRect(Math.random() * 512, Math.random() * 512, 1, 1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.25, 1.35)
  texture.colorSpace = THREE.SRGBColorSpace
  return new THREE.MeshPhysicalMaterial({ map: texture, color: '#6e3037', roughness: .62, metalness: .05, clearcoat: .12, clearcoatRoughness: .65 })
}

const exhibitWallMaterial = createExhibitWallMaterial()

const posterTextureCache = new Map<string, THREE.CanvasTexture>()

function posterTexture(item: GalleryItem) {
  const cached = posterTextureCache.get(item.id)
  if (cached) return cached

  const art = document.createElement('canvas')
  art.width = 720
  art.height = 1080
  const context = art.getContext('2d')!
  const [ink, accent, glow] = item.palette
  const gradient = context.createLinearGradient(0, 0, art.width, art.height)
  gradient.addColorStop(0, ink)
  gradient.addColorStop(0.54, '#12080b')
  gradient.addColorStop(1, glow)
  context.fillStyle = gradient
  context.fillRect(0, 0, art.width, art.height)

  context.globalAlpha = 0.18
  for (let i = 0; i < 70; i += 1) {
    context.fillStyle = i % 3 === 0 ? accent : '#f8d8ad'
    context.fillRect((i * 73) % art.width, (i * 151) % art.height, 2, 2)
  }
  context.globalAlpha = 1

  context.save()
  context.translate(art.width / 2, 435)
  if (item.motif === 'eclipse') {
    context.fillStyle = accent
    context.beginPath(); context.arc(0, 0, 180, 0, Math.PI * 2); context.fill()
    context.fillStyle = '#14070a'
    context.beginPath(); context.arc(46, -25, 156, 0, Math.PI * 2); context.fill()
  }
  if (item.motif === 'curtain') {
    context.fillStyle = accent
    for (let i = -3; i <= 3; i += 1) {
      context.beginPath(); context.moveTo(i * 100 - 60, -250); context.quadraticCurveTo(i * 100 + 15, 20, i * 100 - 12, 270); context.lineTo(i * 100 + 45, 270); context.quadraticCurveTo(i * 100 + 88, 0, i * 100 + 35, -250); context.fill()
    }
  }
  if (item.motif === 'stairway') {
    context.fillStyle = accent
    for (let i = 0; i < 8; i += 1) context.fillRect(-260 + i * 42, 220 - i * 58, 530 - i * 84, 28)
  }
  if (item.motif === 'moon') {
    context.fillStyle = glow
    context.beginPath(); context.arc(0, -25, 175, 0, Math.PI * 2); context.fill()
    context.fillStyle = ink
    context.beginPath(); context.arc(64, -80, 165, 0, Math.PI * 2); context.fill()
  }
  if (item.motif === 'spotlight') {
    context.fillStyle = accent
    context.beginPath(); context.moveTo(-280, -260); context.lineTo(110, -260); context.lineTo(280, 265); context.lineTo(-80, 265); context.fill()
  }
  context.restore()

  context.fillStyle = '#f7e6ce'
  context.font = '700 26px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText(item.subtitle.toUpperCase(), art.width / 2, 786)
  context.font = '900 72px Arial, sans-serif'
  context.fillStyle = '#fff5e5'
  context.fillText(item.title, art.width / 2, 876)
  context.strokeStyle = accent
  context.lineWidth = 5
  context.beginPath(); context.moveTo(122, 926); context.lineTo(598, 926); context.stroke()
  context.font = '600 20px Arial, sans-serif'
  context.fillStyle = '#f7e6ce'
  context.fillText('A MY MOVIE GALLERY PLACEHOLDER', art.width / 2, 976)

  const texture = new THREE.CanvasTexture(art)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  posterTextureCache.set(item.id, texture)

  if (item.posterUrl) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const scale = Math.max(art.width / image.width, art.height / image.height)
      const width = image.width * scale
      const height = image.height * scale
      context.drawImage(image, (art.width - width) / 2, (art.height - height) / 2, width, height)
      const footer = context.createLinearGradient(0, 690, 0, art.height)
      footer.addColorStop(0, 'rgba(10, 5, 6, 0)')
      footer.addColorStop(0.34, 'rgba(10, 5, 6, .84)')
      footer.addColorStop(1, 'rgba(10, 5, 6, .98)')
      context.fillStyle = footer
      context.fillRect(0, 650, art.width, art.height - 650)
      context.textAlign = 'center'
      context.fillStyle = '#f7e6ce'
      context.font = '700 24px Arial, sans-serif'
      context.fillText(item.rating ? `YOUR RATING  ${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}` : 'YOUR WATCHED COLLECTION', art.width / 2, 835)
      context.font = '900 58px Arial, sans-serif'
      context.fillStyle = '#fff5e5'
      context.fillText(item.title.toUpperCase(), art.width / 2, 910)
      if (item.thought) {
        context.font = 'italic 24px Georgia, serif'
        context.fillStyle = '#f2d4a4'
        const words = item.thought.split(/\s+/)
        const lines: string[] = []
        let line = ''
        words.forEach((word) => { const next = `${line} ${word}`.trim(); if (context.measureText(next).width > 570 && line) { lines.push(line); line = word } else line = next })
        if (line) lines.push(line)
        lines.slice(0, 2).forEach((lineText, index) => context.fillText(index === 0 ? `“${lineText}` : `${lineText}”`, art.width / 2, 958 + index * 30))
      }
      texture.needsUpdate = true
    }
    image.src = item.posterUrl
  }
  return texture
}

type Section = THREE.Group & { userData: { itemIndex: number; poster: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>; glow: THREE.PointLight } }

function createSection(): Section {
  const section = new THREE.Group() as Section
  const wall = new THREE.Mesh(new THREE.BoxGeometry(11.6, 7.2, 0.28), exhibitWallMaterial)
  wall.position.y = 3.6
  wall.receiveShadow = true
  section.add(wall)

  const arch = new THREE.Mesh(new THREE.BoxGeometry(6.25, 6.75, 0.22), new THREE.MeshPhysicalMaterial({ color: '#170a0d', roughness: 0.44, metalness: 0.38, clearcoat: 0.52, clearcoatRoughness: 0.26 }))
  arch.position.set(0, 3.62, 0.19)
  section.add(arch)

  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.76, 5.94, 0.19), new THREE.MeshPhysicalMaterial({ color: '#080708', roughness: 0.16, metalness: 0.88, clearcoat: 0.9, clearcoatRoughness: 0.12 }))
  frame.position.set(0, 3.65, 0.34)
  section.add(frame)

  const poster = new THREE.Mesh(new THREE.PlaneGeometry(4.28, 5.46), new THREE.MeshStandardMaterial({ color: '#801f24', roughness: 0.48, metalness: 0.08, emissive: '#180607', emissiveIntensity: 0.18 }))
  poster.position.set(0, 3.65, 0.45)
  section.add(poster)

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.36, 5.54), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.26, roughness: 0.04, metalness: 0, transmission: 0.28, thickness: 0.12, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false }))
  glass.position.set(0, 3.65, 0.49)
  section.add(glass)

  const glow = new THREE.PointLight('#f6c56d', 10.5, 15, 2)
  glow.position.set(0, 6.5, 2.1)
  section.add(glow)
  section.userData = { itemIndex: Number.NaN, poster, glow }
  return section
}

const sectionPool = Array.from({ length: 6 }, createSection)
sectionPool.forEach((section) => scene.add(section))

// The browser walkthrough uses the actual Blender scene exported as GLB.  The
// earlier procedural corridor remains in the source as a loading fallback, but
// is never drawn once the Blender model is available.
corridor.visible = false
const blenderModel = new THREE.Group()
scene.add(blenderModel)
let blenderModelReady = false
const movementKeys = new Set<string>()
let lastWalkTime = 0

function activateBlenderWalkthrough() {
  if (!blenderModelReady) return
  document.body.classList.remove('is-blender-gallery')
  blenderGalleryRender.setAttribute('aria-hidden', 'true')
  // Matches the exported Blender hero camera (0, -12, 4.6) after glTF's
  // Z-up to Y-up conversion, so the browser starts in the intended gallery view.
  camera.position.set(0, 4.6, 12)
  camera.fov = 44
  camera.updateProjectionMatrix()
  camera.rotation.set(0, 0, 0)
}

new GLTFLoader().load('/plan-gallery.glb', (gltf) => {
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = false
    object.receiveShadow = false
    object.frustumCulled = true
  })
  blenderModel.add(gltf.scene)
  blenderModelReady = true
  if (galleryActive) activateBlenderWalkthrough()
})

window.addEventListener('keydown', (event) => {
  if (!blenderWalkActive || !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) return
  movementKeys.add(event.code)
})
window.addEventListener('keyup', (event) => movementKeys.delete(event.code))

function setSectionItem(section: Section, index: number) {
  const itemIndex = ((index % galleryItems.length) + galleryItems.length) % galleryItems.length
  if (section.userData.itemIndex === index) return
  const item = galleryItems[itemIndex]
  section.userData.itemIndex = index
  section.userData.poster.material.map = posterTexture(item)
  section.userData.poster.material.needsUpdate = true
  section.userData.glow.color.set(item.palette[1])
}

// The reference uses a gentle inertial response; the multiplier shortens the walk
// between canvases so a single deliberate wheel gesture reaches the next display.
const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1.45, syncTouch: true })
let galleryActive = false
let blenderWalkActive = false
const updateBlenderWalk = () => {
  if (!blenderWalkActive) return
  const distance = Math.max(1, app.scrollHeight - app.clientHeight)
  const progress = Math.min(1, Math.max(0, app.scrollTop / distance))
  document.documentElement.style.setProperty('--blender-walk-progress', progress.toFixed(4))
}
window.addEventListener('gallery:entered', () => {
  galleryActive = true
  blenderWalkActive = true
  document.body.classList.add('is-blender-gallery')
  blenderGalleryRender.setAttribute('aria-hidden', 'false')
  app.style.overflowY = ''
  lenis.scrollTo(0, { immediate: true })
  activateBlenderWalkthrough()
})
window.addEventListener('gallery:exited', () => {
  galleryActive = false
  blenderWalkActive = false
  document.body.classList.remove('is-blender-gallery')
  blenderGalleryRender.setAttribute('aria-hidden', 'true')
  document.documentElement.style.removeProperty('--blender-walk-progress')
  app.style.overflowY = ''
  movementKeys.clear()
})
app.addEventListener('scroll', updateBlenderWalk, { passive: true })
window.addEventListener('gallery:keyboard-scroll', ((event: CustomEvent<{ delta: number }>) => {
  lenis.scrollTo(lenis.animatedScroll + event.detail.delta)
}) as EventListener)
const travel = { screensPerItem: 1.35, sectionSpacing: 12 }
let scrollablePixels = 1
const walkingMotion = {
  lastScroll: 0,
  lastTime: 0,
  energy: 0,
  x: 0,
  yaw: 0,
  roll: 0,
}

function resize() {
  const { innerWidth: width, innerHeight: height } = window
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.fov = Math.min(78, Math.max(54, 54 + (1 - Math.min(width / height, 1)) * 18))
  camera.updateProjectionMatrix()
  track.style.height = `${galleryItems.length * height * travel.screensPerItem + height}px`
  scrollablePixels = Math.max(1, document.documentElement.scrollHeight - height)
}

window.addEventListener('gallery:add-watched-movie', ((event: CustomEvent<WatchedMovieDetail>) => {
  const movie = event.detail
  galleryItems.unshift({
    id: movie.id,
    title: movie.title,
    subtitle: `${movie.releaseYear} · Your watched collection`,
    palette: ['#32101a', '#d3a15a', '#110709'],
    motif: 'spotlight',
    rating: movie.rating,
    thought: movie.thought,
    posterUrl: movie.posterUrl,
  })
  posterTextureCache.clear()
  resize()
  lenis.scrollTo(0, { immediate: true })
}) as EventListener)

window.addEventListener('gallery:remove-watched-movie', ((event: CustomEvent<{ id: string }>) => {
  const itemIndex = galleryItems.findIndex((item) => item.id === event.detail.id)
  if (itemIndex < 0) return
  const [removed] = galleryItems.splice(itemIndex, 1)
  posterTextureCache.get(removed.id)?.dispose()
  posterTextureCache.delete(removed.id)
  resize()
}) as EventListener)

window.addEventListener('resize', resize)
resize()

const queryPosition = Number.parseFloat(new URLSearchParams(window.location.search).get('at') ?? '')
const hasQueryPosition = Number.isFinite(queryPosition)
if (hasQueryPosition) lenis.stop()

function update(time: number) {
  if (!galleryActive) return
  if (blenderWalkActive) {
    if (!blenderModelReady) return
    const deltaSeconds = Math.min(0.05, Math.max(0.001, time - lastWalkTime || 0.016))
    lastWalkTime = time
    const speed = 7.2 * deltaSeconds
    const forward = Number(movementKeys.has('KeyW')) - Number(movementKeys.has('KeyS'))
    const strafe = Number(movementKeys.has('KeyD')) - Number(movementKeys.has('KeyA'))
    camera.position.z = THREE.MathUtils.clamp(camera.position.z - forward * speed, -36, 12)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x + strafe * speed, -8.5, 8.5)
    renderer.render(scene, camera)
    return
  }
  lenis.raf(time * 1000)
  const scroll = hasQueryPosition ? queryPosition : lenis.animatedScroll
  const deltaTime = Math.min(0.05, Math.max(0.001, time - walkingMotion.lastTime || 0.016))
  const scrollVelocity = (scroll - walkingMotion.lastScroll) / deltaTime
  const scrollProgress = THREE.MathUtils.clamp(scroll / scrollablePixels, 0, 1)
  const galleryDistance = scrollProgress * galleryItems.length * travel.sectionSpacing
  const currentItem = Math.floor(galleryDistance / travel.sectionSpacing)

  for (let slot = 0; slot < sectionPool.length; slot += 1) {
    const itemIndex = currentItem + slot - 1
    const section = sectionPool[slot]
    section.position.z = -itemIndex * travel.sectionSpacing
    setSectionItem(section, itemIndex)
  }

  const reducedMotion = prefersReducedMotion.matches
  const movement = reducedMotion ? 0 : THREE.MathUtils.clamp(Math.abs(scrollVelocity) / 120, 0, 1)
  walkingMotion.energy = THREE.MathUtils.damp(walkingMotion.energy, movement, 4.5, deltaTime)

  // Travel is straight while approaching each canvas, then makes a restrained
  // alternating arc into the aisle before the next canvas comes into view.
  const localProgress = (galleryDistance / travel.sectionSpacing) % 1
  const arcProgress = THREE.MathUtils.clamp((localProgress - 0.42) / 0.58, 0, 1)
  const easedArc = arcProgress * arcProgress * (3 - 2 * arcProgress)
  const direction = Math.floor(galleryDistance / travel.sectionSpacing) % 2 === 0 ? 1 : -1
  const arcX = reducedMotion ? 0 : direction * 2.15 * Math.sin(Math.PI * easedArc)
  const stride = Math.sin(galleryDistance * 1.35)
  const targetX = reducedMotion ? 0 : arcX + stride * 0.12 * walkingMotion.energy
  const targetYaw = reducedMotion ? 0 : -direction * 0.12 * Math.sin(Math.PI * easedArc) - stride * 0.01 * walkingMotion.energy
  const targetRoll = reducedMotion ? 0 : -stride * 0.006 * walkingMotion.energy
  walkingMotion.x = THREE.MathUtils.damp(walkingMotion.x, targetX, 5.5, deltaTime)
  walkingMotion.yaw = THREE.MathUtils.damp(walkingMotion.yaw, targetYaw, 5.5, deltaTime)
  walkingMotion.roll = THREE.MathUtils.damp(walkingMotion.roll, targetRoll, 5.5, deltaTime)

  const idleBob = reducedMotion ? 0 : Math.sin(time * 1.35) * 0.018
  camera.position.set(walkingMotion.x, 2.65 + idleBob, 8 - galleryDistance)
  camera.rotation.set(idleBob * 0.12, walkingMotion.yaw, walkingMotion.roll)
  warmLight.position.z = camera.position.z + 7
  warmLight.target.position.set(walkingMotion.x * 0.5, 2.6, camera.position.z - 8)
  warmLight.target.updateMatrixWorld()
  walkingMotion.lastScroll = scroll
  walkingMotion.lastTime = time
  renderer.render(scene, camera)
}

gsap.ticker.add(update)
gsap.ticker.lagSmoothing(0)
gsap.to(darkVeil, { opacity: 0, duration: 1.25, delay: 0.2, ease: 'sine.inOut', onComplete: () => darkVeil.remove() })
