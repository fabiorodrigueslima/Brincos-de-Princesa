export function scrollViewportToTop(viewport = window) {
  viewport.scrollTo({ top: 0, behavior: 'instant' })
}
