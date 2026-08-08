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
