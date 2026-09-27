const TMDB_IMAGE_ORIGIN = 'https://image.tmdb.org/t/p/w780'
const VALID_POSTER_PATH = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i

/**
 * Proxies an individual TMDB poster through this site's origin so Three.js can
 * use it as a WebGL texture. Raw TMDB image responses do not include the CORS
 * header that WebGL texture loading requires.
 */
export default async function handler(request, response) {
  const value = Array.isArray(request.query.path) ? request.query.path[0] : request.query.path
  if (typeof value !== 'string' || !VALID_POSTER_PATH.test(value)) {
    response.status(400).json({ error: 'A valid TMDB poster path is required.' })
    return
  }

  const upstream = await fetch(`${TMDB_IMAGE_ORIGIN}${value}`)
  if (!upstream.ok) {
    response.status(502).json({ error: 'TMDB poster could not be loaded.' })
    return
  }

  const bytes = Buffer.from(await upstream.arrayBuffer())
  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'image/jpeg')
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.status(200).send(bytes)
}
