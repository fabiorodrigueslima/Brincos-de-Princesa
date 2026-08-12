import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CourseCard } from '../../components/commerce/CourseCard.jsx'
import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getCourses } from '../../services/api.js'

export function CoursesPage() {
  const [state, setState] = useState({ loading: true, courses: [], error: '' })
  useEffect(() => { const controller = new AbortController(); getCourses({ page: 1, limit: 12 }, controller.signal).then((response) => setState({ loading: false, courses: response.data, error: '' })).catch((reason) => { if (reason.name !== 'AbortError') setState({ loading: false, courses: [], error: reason.message }) }); return () => controller.abort() }, [])
  return <>
    <PageMeta title="Cursos e experiências artesanais" description="Conheça os cursos, oficinas e experiências artesanais publicados pela Brinco de Princesa." />
    <PageHero eyebrow="Cursos" title="Aprender também é transformar." text="Um espaço para futuras experiências, oficinas e encontros relacionados ao fazer artesanal." />
    <section className="courses-page container">
      {state.loading && <div className="catalog-state" aria-live="polite"><span className="loader" />Carregando cursos…</div>}
      {state.error && <div className="catalog-state catalog-error" role="status"><h2>Os cursos estão temporariamente indisponíveis.</h2><p>{state.error}</p></div>}
      {!state.loading && !state.error && state.courses.length === 0 && <div className="courses-empty"><p className="eyebrow">Em preparação</p><h2>Novas experiências estão sendo preparadas.</h2><p>Quando cursos ou oficinas forem publicados, todas as informações confirmadas aparecerão aqui.</p><Link className="button button-primary" to="/contato">Acompanhar pelos canais oficiais</Link></div>}
      {state.courses.length > 0 && <div className="course-grid">{state.courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>}
    </section>
  </>
}
