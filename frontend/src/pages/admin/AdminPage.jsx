import { useEffect, useState } from 'react'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { adminLogin, adminLogout, adminMe, getAdminResource } from '../../services/api.js'

const sections = [{key:'dashboard',label:'Visão geral'},{key:'products',label:'Produtos'},{key:'stock',label:'Estoque'},{key:'orders',label:'Pedidos'},{key:'courses',label:'Cursos'},{key:'categories',label:'Categorias'},{key:'collections',label:'Coleções'},{key:'settings',label:'Configurações'}]
const money = (value) => value == null ? '—' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value))

function Login({ onSuccess }) {
  const [form,setForm]=useState({email:'',password:''});const [error,setError]=useState('');const [loading,setLoading]=useState(false)
  const submit=async(event)=>{event.preventDefault();setLoading(true);setError('');try{const {data}=await adminLogin(form);onSuccess(data)}catch(reason){setError(reason.message)}finally{setLoading(false)}}
  return <main className="admin-login"><PageMeta title="Acesso administrativo" description="Área restrita da Brinco de Princesa." noindex /><form onSubmit={submit}><p className="eyebrow">Área restrita</p><h1>Painel administrativo</h1><p>Entre com as credenciais criadas pelo mecanismo seguro de bootstrap.</p><label>E-mail<input type="email" autoComplete="username" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required /></label><label>Senha<input type="password" autoComplete="current-password" minLength="12" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required /></label><p className="admin-message" role="alert">{error}</p><button className="button button-primary" disabled={loading}>{loading?'Entrando…':'Entrar'}</button></form></main>
}

function Resource({ section }) {
  const [state,setState]=useState({data:null,error:''})
  useEffect(()=>{const controller=new AbortController();getAdminResource(section,section==='products'||section==='orders'?{page:1,limit:20}:{},controller.signal).then(({data})=>setState({data,error:''})).catch((e)=>{if(e.name!=='AbortError')setState({data:null,error:e.message})});return()=>controller.abort()},[section])
  if(state.error)return <div className="admin-state" role="alert">{state.error}</div>
  if(!state.data)return <div className="admin-state" role="status">Carregando…</div>
  if(section==='dashboard')return <div className="admin-metrics">{Object.entries(state.data).map(([key,value])=><article key={key}><strong>{value}</strong><span>{({active_products:'Produtos ativos',pending_orders:'Aguardando pagamento',paid_orders:'Pedidos pagos',active_reservations:'Reservas ativas',published_courses:'Cursos publicados'})[key]??key}</span></article>)}</div>
  if(section==='settings')return <div className="admin-settings"><h2>Integrações</h2><p>Frete: não configurado</p><p>Pagamento: não configurado</p><p>Armazenamento de imagens: não configurado</p><h2>Configurações seguras</h2>{state.data.map(item=><p key={item.chave}><strong>{item.descricao}</strong>: {JSON.stringify(item.valor)}</p>)}</div>
  const rows=Array.isArray(state.data)?state.data:[]
  if(!rows.length)return <div className="admin-state">Nenhum registro encontrado.</div>
  return <div className="admin-cards">{rows.map((row,index)=><article key={row.id??index}>{section==='products'&&<><h2>{row.nome}</h2><p>{row.categoria||'Sem categoria'} · {row.status}</p><p>{money(row.preco_inicial)} · {row.estoque_disponivel} disponíveis</p></>}{section==='stock'&&<><h2>{row.produto}</h2><p>{row.variante} · SKU {row.sku}</p><p>Físico: {row.estoque} · Reservado: {row.estoque_reservado} · Disponível: {row.disponivel}</p></>}{section==='orders'&&<><h2>{row.codigo_publico}</h2><p>{row.status} · Pagamento: {row.pagamento_status||'sem cobrança'}</p><p>{money(row.total)}</p></>}{section==='courses'&&<><h2>{row.nome}</h2><p>{row.status} · {row.sessoes} turmas</p></>}{['categories','collections'].includes(section)&&<><h2>{row.nome}</h2><p>{row.ativa?'Ativa':'Inativa'} · {row.slug}</p></>}</article>)}</div>
}

export function AdminPage(){const [session,setSession]=useState(null);const [checking,setChecking]=useState(true);const [section,setSection]=useState('dashboard')
  useEffect(()=>{adminMe().then(({data})=>setSession(data)).catch(()=>{}).finally(()=>setChecking(false))},[])
  if(checking)return <div className="admin-state">Verificando acesso…</div>
  if(!session)return <Login onSuccess={setSession}/>
  return <div className="admin-shell"><PageMeta title="Painel administrativo" description="Operação da Brinco de Princesa." noindex /><a className="skip-link" href="#admin-content">Ir para o conteúdo</a><aside><strong>Brinco de Princesa</strong><span>{session.user.name}<small>{session.user.role}</small></span><nav aria-label="Seções administrativas">{sections.map(item=><button key={item.key} className={section===item.key?'active':''} onClick={()=>setSection(item.key)}>{item.label}</button>)}</nav><button className="admin-logout" onClick={async()=>{if(session.csrfToken)await adminLogout(session.csrfToken);setSession(null)}}>Sair</button></aside><main id="admin-content"><header><p className="eyebrow">Operação</p><h1>{sections.find(item=>item.key===section)?.label}</h1></header><Resource section={section}/></main></div>}
