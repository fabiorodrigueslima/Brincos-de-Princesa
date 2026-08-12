import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getCourse } from '../../services/api.js'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

export function CoursePage() {
  const { slug } = useParams(); const [state, setState] = useState({ loading: true, course: null, error: '' })
  useEffect(() => { const controller = new AbortController(); getCourse(slug, controller.signal).then((response) => setState({ loading: false, course: response.data, error: '' })).catch((reason) => { if (reason.name !== 'AbortError') setState({ loading: false, course: null, error: reason.code === 'COURSE_NOT_FOUND' ? 'not-found' : reason.message }) }); return () => controller.abort() }, [slug])
  if (state.loading) return <div className="catalog-state product-state" aria-live="polite"><span className="loader" />Carregando curso…</div>
  if (state.error === 'not-found') return <section className="catalog-state product-state container"><PageMeta title="Curso não encontrado" description="O curso solicitado não foi encontrado." /><h1>Curso não encontrado.</h1><p>Ele pode ainda não estar publicado ou o endereço pode ter mudado.</p><Link className="button button-primary" to="/cursos">Ver todos os cursos</Link></section>
  if (state.error) return <section className="catalog-state product-state container"><PageMeta title="Curso indisponível" description="Não foi possível carregar este curso." /><h1>Não foi possível abrir este curso.</h1><p>{state.error}</p><Link className="button button-primary" to="/cursos">Ver todos os cursos</Link></section>
  const course = state.course
  return <>
    <PageMeta title={course.name} description={(course.summary || course.description || `Conheça ${course.name}.`).slice(0, 160)} />
    <article className="course-detail container"><div className="course-detail-media">{course.image ? <img src={course.image.url} alt={course.image.alt} /> : <div className="course-image-placeholder"><span>Imagem em preparação</span></div>}</div><div className="course-detail-copy"><nav aria-label="Breadcrumb"><Link to="/cursos">Cursos</Link><span aria-hidden="true"> / </span><span>{course.name}</span></nav><p className="eyebrow">Experiência artesanal</p><h1>{course.name}</h1>{course.summary && <p className="course-summary">{course.summary}</p>}{course.description && <div className="course-description"><h2>Sobre o curso</h2><p>{course.description}</p></div>}</div></article>
    {course.sessions.length > 0 && <section className="course-sessions container narrow"><p className="eyebrow">Próximas sessões</p><h2>Datas publicadas</h2><div>{course.sessions.map((session) => <article key={session.id}><div>{session.startsAt && <><strong>Início</strong><span>{dateTime.format(new Date(session.startsAt))}</span></>}{session.endsAt && <><strong>Término</strong><span>{dateTime.format(new Date(session.endsAt))}</span></>}</div>{session.location && <p><strong>Local</strong><span>{session.location}</span></p>}{session.seats && <p><strong>Vagas informadas</strong><span>{session.seats}</span></p>}</article>)}</div></section>}
    <section className="quote-section container narrow"><p className="eyebrow">Informações</p><h2>Quer saber quando houver novidades?</h2><p>Os canais oficiais serão usados para comunicar novas sessões e orientações confirmadas.</p><Link className="button button-primary" to="/contato">Ver contato</Link></section>
  </>
}
