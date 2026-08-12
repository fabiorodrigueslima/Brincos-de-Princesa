# Fase 5 — Evolução da página de produto

## Decisões

Não foi criada migration: `produtos` já oferece descrição, materiais, medidas, peso, cuidados e prazo de produção; `produto_variantes.atributos` aceita características flexíveis como acabamento, metal, fecho ou técnica; imagens e coleções já possuem relações próprias.

Nenhum dado ausente é inferido. Materiais, medidas, peso, produção, cuidados e atributos só aparecem quando a API fornece um valor real. Essa escolha mantém o catálogo apto a cerâmica, resina, metais, elementos naturais e futuros tipos de produto.

## Estrutura e comportamento

- breadcrumb com categoria real;
- galeria com imagem principal, miniaturas, fallback e ampliação;
- nome, categoria, coleções, preço e promoção da variante selecionada;
- variantes disponíveis e indisponíveis visualmente distintas;
- quantidade limitada ao estoque conhecido e inclusão no carrinho existente;
- seções “Sobre a peça”, “Detalhes” e “Cuidados”, condicionais aos dados;
- mensagem institucional sobre as variações do trabalho artesanal.

O preço continua vindo da API. Uma promoção só aparece quando é positiva e menor que o preço normal. O frontend não envia preço ao carrinho. O estoque usa apenas “Disponível” e “Indisponível”. Ao trocar de variante, a quantidade retorna a um e não ultrapassa o estoque conhecido nem o limite existente de 99.

## Galeria, SEO e acessibilidade

A imagem preserva proporção; miniaturas são botões com estado pressionado e imagens secundárias têm carregamento tardio. O diálogo de ampliação fecha por botão, fundo ou Escape, contém o foco e o devolve ao controle anterior.

`PageMeta` aceita tipo e imagem Open Graph. A página usa título, descrição e imagem reais e o tipo `product`. Canonical absoluto aguarda confirmação do domínio. JSON-LD foi adiado porque os dados atuais não permitem completar propriedades comerciais desejáveis sem assumir marca, SKU global ou uma única oferta.

Não há requests adicionais nem biblioteca de galeria. Produtos relacionados foram adiados para evitar ampliar API e escopo. Testes unitários cobrem preço, promoção, atributos flexíveis, opcionais ausentes, detalhes e rotas. Frete, checkout, pagamentos, pedidos, reserva de estoque, administração, autenticação e inscrições continuam fora desta fase.
