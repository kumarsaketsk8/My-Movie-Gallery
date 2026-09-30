/**
 * Loads the visual-feedback toolbar in local Vite previews only. Keeping this
 * dynamic means the production gallery does not fetch or render Agentation.
 */
export async function mountAgentation() {
  if (!import.meta.env.DEV || document.getElementById('agentation-preview-root')) return

  const [{ createElement }, { createRoot }, { Agentation }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('agentation'),
  ])
  const host = document.createElement('div')
  host.id = 'agentation-preview-root'
  document.body.append(host)

  const PreviewToolbar = () => Agentation({
    appName: 'My Movie Gallery preview',
    className: 'agentation-preview-toolbar',
  })
  createRoot(host).render(createElement(PreviewToolbar))
}
