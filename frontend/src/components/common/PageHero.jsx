export function PageHero({ eyebrow, title, text }) {
  return (
    <header className="page-hero">
      <div className="container narrow">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
    </header>
  )
}
