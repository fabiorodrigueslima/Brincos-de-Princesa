function Icon({ children, ...props }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
}

export function MenuIcon() { return <Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon> }
export function XIcon() { return <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon> }
export function ShoppingBagIcon() { return <Icon><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></Icon> }
export function ArrowIcon() { return <Icon width="18" height="18"><path d="M5 12h14M14 7l5 5-5 5" /></Icon> }
export function LeafIcon() { return <Icon><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z" /><path d="M4 21c3-5 7-9 12-12" /></Icon> }
export function HeartIcon() { return <Icon><path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.4 1-1a5.5 5.5 0 0 0 0-7.8Z" /></Icon> }
export function SparkleIcon() { return <Icon><path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z" /><path d="m19 15 .6 2.1L22 18l-2.4.9L19 21l-.6-2.1L16 18l2.4-.9L19 15Z" /></Icon> }
export function InstagramIcon() { return <Icon><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></Icon> }
export function TikTokIcon() { return <Icon><path d="M14 4v10.2a3.8 3.8 0 1 1-3-3.7" /><path d="M14 4c.7 2.3 2.2 3.7 4.5 4" /></Icon> }
export function FacebookIcon() { return <Icon><path d="M14 21v-8h2.7l.4-3H14V8.2c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.2C12.3 3.8 11 5.1 11 7.5V10H8.5v3H11v8" /></Icon> }
export function YoutubeIcon() { return <Icon><path d="M21 7.5a2.4 2.4 0 0 0-1.7-1.7C17.8 5.4 12 5.4 12 5.4s-5.8 0-7.3.4A2.4 2.4 0 0 0 3 7.5 25 25 0 0 0 2.6 12c0 1.6.1 3.1.4 4.5a2.4 2.4 0 0 0 1.7 1.7c1.5.4 7.3.4 7.3.4s5.8 0 7.3-.4a2.4 2.4 0 0 0 1.7-1.7c.3-1.4.4-2.9.4-4.5s-.1-3.1-.4-4.5Z" /><path d="m10 9 5 3-5 3V9Z" /></Icon> }
