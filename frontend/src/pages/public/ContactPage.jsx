import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

export function ContactPage() {
  return (
    <>
      <PageMeta title="Contato" description="Informações de atendimento da Brinco de Princesa." />
      <PageHero eyebrow="Contato" title="Vamos conversar com calma." text="Os canais oficiais de atendimento serão publicados aqui após a confirmação da marca." />
      <section className="contact-grid container">
        <article><span>01</span><h2>Atendimento</h2><p>O e-mail, telefone e horário de atendimento ainda não foram fornecidos. Preferimos não inventar dados de contato.</p></article>
        <article><span>02</span><h2>Personalizados</h2><p>O formulário de encomendas será ativado somente quando houver um canal capaz de receber e proteger seus dados corretamente.</p></article>
        <article><span>03</span><h2>Redes sociais</h2><p>Os perfis oficiais serão adicionados após confirmação dos endereços corretos.</p></article>
      </section>
      <section className="contact-note container narrow"><p className="eyebrow">Transparência</p><h2>Por que ainda não há formulário?</h2><p>Um formulário real precisa de destino, proteção contra abuso, política de retenção e resposta operacional. Até esses pontos estarem definidos, esta página não coleta nenhum dado pessoal.</p></section>
    </>
  )
}
