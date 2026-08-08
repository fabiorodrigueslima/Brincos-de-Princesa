import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollViewportToTop } from './scrollViewportToTop.js'

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    scrollViewportToTop()
  }, [pathname])

  return null
}
