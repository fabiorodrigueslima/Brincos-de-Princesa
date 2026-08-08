import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

const content = {
  privacy: {
    label: 'Privacidade', title: 'Política de Privacidade', description: 'Como a Brinco de Princesa protege dados pessoais neste site.',
    intro: 'Esta versão descreve o site institucional atual. Ela deverá ser revisada antes da ativação de contas, checkout, pagamentos, analytics ou formulários.',
    sections: [
      ['Dados tratados atualmente', 'Neste estágio, o site não possui cadastro, checkout, newsletter, analytics ou formulário de contato. O servidor poderá tratar registros técnicos mínimos para segurança e disponibilidade, sem registrar senhas, tokens, cookies completos ou dados de cartão.'],
      ['Cookies', 'A aplicação foi planejada para utilizar apenas cookies essenciais quando funcionalidades de sessão e segurança forem ativadas. Cookies de publicidade ou medição não foram adicionados.'],
      ['Compras futuras', 'Quando a loja for ativada, dados estritamente necessários para pedido, entrega, atendimento e obrigações aplicáveis serão tratados. Finalidades, retenções, fornecedores e direitos serão detalhados antes do lançamento.'],
      ['Seus direitos', 'O canal para solicitações de titulares será publicado junto aos dados oficiais de contato. Pedidos serão analisados conforme a LGPD e as obrigações de retenção aplicáveis.'],
    ],
  },
  terms: {
    label: 'Transparência', title: 'Termos de Uso', description: 'Condições atuais de uso do site Brinco de Princesa.',
    intro: 'Este site está em desenvolvimento institucional. A navegação não cria pedido, reserva, compra ou obrigação de venda.',
    sections: [
      ['Conteúdo institucional', 'Textos e imagens apresentam a proposta da marca. As fotografias editoriais atuais são conceituais e serão substituídas ou complementadas por imagens oficiais.'],
      ['Loja em preparação', 'Enquanto catálogo e checkout não estiverem ativos, não existem preços, estoque, pagamento ou contratação por este site.'],
      ['Uso adequado', 'Não é permitido tentar comprometer a segurança, contornar controles, automatizar abuso ou utilizar o conteúdo de forma ilícita.'],
      ['Atualizações', 'Estes termos serão atualizados antes da abertura comercial da loja para refletir compra, entrega, pagamento e atendimento.'],
    ],
  },
  returns: {
    label: 'Atendimento', title: 'Trocas e Devoluções', description: 'Informações preliminares sobre trocas e devoluções.',
    intro: 'A política comercial definitiva será publicada antes da primeira venda e deverá refletir a legislação aplicável e as características das peças artesanais.',
    sections: [
      ['Antes da compra', 'Materiais, medidas, peso, variações artesanais, cuidados e prazo de produção serão informados na página de cada produto.'],
      ['Direito de arrependimento', 'Compras online terão procedimento compatível com o direito de arrependimento e demais direitos do consumidor aplicáveis. Prazos e canal operacional serão detalhados antes do lançamento.'],
      ['Defeito ou avaria', 'O atendimento solicitará apenas as informações necessárias para identificar o pedido e avaliar a ocorrência, oferecendo as soluções previstas na legislação.'],
      ['Peças personalizadas', 'Condições específicas dependerão do grau de personalização e serão apresentadas claramente antes da contratação, sem afastar direitos que não possam ser renunciados.'],
    ],
  },
}

export function LegalPage({ type }) {
  const page = content[type]
  return (
    <>
      <PageMeta title={page.title} description={page.description} />
      <PageHero eyebrow={page.label} title={page.title} text={page.intro} />
      <article className="legal-content container narrow">
        <p className="legal-status">Versão preliminar — atualizada em 8 de agosto de 2026.</p>
        {page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
      </article>
    </>
  )
}
