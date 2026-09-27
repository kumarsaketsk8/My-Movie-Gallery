const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type TmdbMovie = {
  tmdbId: number
  title: string
  releaseYear: number | null
  posterPath: string | null
}

type TmdbSearchResponse = {
  results: Array<{
    id: number
    title: string
    release_date?: string
    poster_path: string | null
  }>
}

const accessToken = import.meta.env.VITE_TMDB_ACCESS_TOKEN?.trim()
const apiKey = import.meta.env.VITE_TMDB_API_KEY?.trim()

export const isTmdbConfigured = Boolean(accessToken || apiKey)

export function posterUrl(posterPath: string | null, size: 'w92' | 'w185' = 'w185') {
  return posterPath ? `${TMDB_IMAGE_BASE}/${size}${posterPath}` : null
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<TmdbMovie[]> {
  if (!isTmdbConfigured) throw new Error('TMDB has not been configured.')

  const url = new URL(`${TMDB_API_BASE}/search/movie`)
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', navigator.language || 'en-US')
  url.searchParams.set('page', '1')
  if (!accessToken && apiKey) url.searchParams.set('api_key', apiKey)

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    signal,
  })
  if (!response.ok) throw new Error(`TMDB search failed (${response.status}).`)

  const data = await response.json() as TmdbSearchResponse
  return data.results.slice(0, 8).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    posterPath: movie.poster_path,
  }))
}
