import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Client } = pg
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL
let client, publishedId, draftId, courseService, closeDatabase
const suffix = `${process.pid}-${Date.now()}`

describe('courses with isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!adminUrl || !new URL(adminUrl).pathname.slice(1).endsWith('_test')) throw new Error('Cursos exigem banco _test')
    client = new Client({ connectionString: adminUrl }); await client.connect()
    publishedId = (await client.query({ text: `INSERT INTO app.cursos(nome,slug,resumo,descricao,status,publicado_em) VALUES($1,$2,$3,$4,'PUBLISHED',now()) RETURNING id`, values: ['Dados de demonstração',`curso-publicado-${suffix}`,'Somente teste automatizado.','Descrição de teste.'] })).rows[0].id
    draftId = (await client.query({ text: `INSERT INTO app.cursos(nome,slug,status) VALUES($1,$2,'DRAFT') RETURNING id`, values: ['Rascunho de teste',`curso-rascunho-${suffix}`] })).rows[0].id
    await client.query({ text: `INSERT INTO app.curso_sessoes(curso_id,inicia_em,termina_em,local,vagas,publica,status) VALUES($1,now()+interval '30 days',now()+interval '30 days 2 hours','Local de teste',8,TRUE,'SCHEDULED'),($1,now()-interval '30 days',NULL,NULL,NULL,TRUE,'SCHEDULED'),($1,now()+interval '40 days',NULL,NULL,NULL,FALSE,'SCHEDULED')`, values: [publishedId] })
    ;({ courseService } = await import('../src/services/courseService.js')); ({ closeDatabase } = await import('../src/config/database.js'))
  })
  afterAll(async () => { if (closeDatabase) await closeDatabase(); if (client) { await client.query('DELETE FROM app.curso_sessoes WHERE curso_id=ANY($1)', [[publishedId,draftId]]); await client.query('DELETE FROM app.cursos WHERE id=ANY($1)', [[publishedId,draftId]]); await client.end() } })
  it('lists only published courses', async () => { const result = await courseService.list({ page:1,limit:12 }); expect(result.items.map(x=>x.slug)).toContain(`curso-publicado-${suffix}`); expect(result.items.map(x=>x.slug)).not.toContain(`curso-rascunho-${suffix}`) })
  it('returns only future public sessions', async () => { const result = await courseService.get(`curso-publicado-${suffix}`); expect(result.sessions).toHaveLength(1); expect(result.sessions[0]).toMatchObject({ location:'Local de teste',seats:8 }) })
  it('hides drafts from detail', async () => { await expect(courseService.get(`curso-rascunho-${suffix}`)).rejects.toMatchObject({ status:404 }) })
  it('enforces relevant constraints', async () => { await expect(client.query("INSERT INTO app.cursos(nome,slug,status) VALUES('X','SLUG INVÁLIDO','DRAFT')")).rejects.toMatchObject({ code:'23514' }); await expect(client.query({ text:"INSERT INTO app.curso_sessoes(curso_id,inicia_em,termina_em) VALUES($1,now(),now()-interval '1 hour')", values:[publishedId] })).rejects.toMatchObject({ code:'23514' }) })
})
