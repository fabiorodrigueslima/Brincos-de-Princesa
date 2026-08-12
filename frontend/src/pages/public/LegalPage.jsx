import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

const content = {
  privacy: {
    label: 'Privacidade', title: 'Política de Privacidade', description: 'Como a Brinco de Princesa protege dados pessoais neste site.',
    intro: 'Esta versão descreve o catálogo e o carrinho local atualmente disponíveis. Ela deverá ser revisada antes da ativação de contas, checkout, pagamentos, analytics ou formulários.',
    sections: [
      ['Pedidos e retenção', 'Quando frete e pagamento reais forem configurados, nome, contato, endereço e snapshots comerciais serão persistidos para executar o pedido, entregar, atender e cumprir obrigações aplicáveis. Prazos definitivos de retenção e descarte serão publicados antes da abertura comercial.'],
      ['Operadores externos', 'Transportadora e gateway receberão somente os dados necessários às suas finalidades. A aplicação não recebe nem armazena número completo de cartão ou código de segurança. Eventos técnicos do gateway são reduzidos a identificadores, status e hashes necessários à segurança e rastreabilidade.'],
      ['Checkout e minimização', 'O checkout solicita nome, e-mail, telefone e endereço somente para preparar a entrega e a revisão. Esses dados ficam na memória da página e não são gravados no navegador ou no banco nesta fase. Não são coletados CPF nem dados de cartão.'],
      ['Consulta de CEP', 'O CEP pode ser enviado pelo servidor a um provedor de consulta de endereço. Nome, e-mail e telefone não são enviados junto ao CEP. Se o serviço estiver indisponível, o endereço pode ser preenchido manualmente.'],
      ['Dados tratados atualmente', 'Neste estágio, o site oferece catálogo público e carrinho anônimo armazenado no navegador. Não há cadastro, checkout, newsletter, analytics ou formulário de contato. O servidor poderá tratar registros técnicos mínimos para segurança e disponibilidade, sem receber dados de cartão.'],
      ['Carrinho local', 'O carrinho guarda no navegador apenas identificadores de variantes e quantidades. Preços e disponibilidade são consultados novamente no servidor; nenhum pedido ou reserva de estoque é criado nessa etapa.'],
      ['Cookies', 'A aplicação foi planejada para utilizar apenas cookies essenciais quando funcionalidades de sessão e segurança forem ativadas. Cookies de publicidade ou medição não foram adicionados.'],
      ['Compras futuras', 'Quando a loja for ativada, dados estritamente necessários para pedido, entrega, atendimento e obrigações aplicáveis serão tratados. Finalidades, retenções, fornecedores e direitos serão detalhados antes do lançamento.'],
      ['Seus direitos', 'O canal para solicitações de titulares será publicado junto aos dados oficiais de contato. Pedidos serão analisados conforme a LGPD e as obrigações de retenção aplicáveis.'],
    ],
  },
  terms: {
    label: 'Transparência', title: 'Termos de Uso', description: 'Condições atuais de uso do site Brinco de Princesa.',
    intro: 'Este site apresenta um catálogo em desenvolvimento e um carrinho local. A navegação e a inclusão de itens no carrinho não criam pedido, reserva, compra ou obrigação de venda.',
    sections: [
      ['Conteúdo institucional', 'Textos e imagens apresentam a proposta da marca. As fotografias editoriais atuais são conceituais e serão substituídas ou complementadas por imagens oficiais.'],
      ['Catálogo e carrinho', 'O catálogo pode apresentar dados de produto, preço e disponibilidade fornecidos pelo servidor. O carrinho permite organizar escolhas, mas não reserva estoque e não conclui contratação. Dados marcados como demonstração não constituem oferta comercial.'],
      ['Checkout em preparação', 'Pagamento, cálculo de frete, criação de pedido e confirmação de compra ainda não estão disponíveis neste site. Nenhuma modalidade ou condição comercial é prometida nesta etapa.'],
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
        <p className="legal-status">Versão preliminar — atualizada em 11 de agosto de 2026.</p>
        {page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
      </article>
    </>
  )
}
