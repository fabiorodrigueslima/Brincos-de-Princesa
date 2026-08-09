# Fase de catálogo, variantes e estoque base

## Escopo concluído nesta fase

A fase mantém React/Vite no frontend, Node/Express no backend e PostgreSQL via `pg`, sem ORM. Carrinho, checkout, pagamentos, autenticação, painel administrativo, cupons comerciais e reserva de estoque por carrinho não foram implementados.

## Modelo do catálogo

### Categorias

`categorias` possui nome, slug único, descrição, flag ativa, ordenação, hierarquia opcional e timestamps. O seed estrutural preserva `brincos`, `resina`, `florais` e `personalizados`.

### Coleções

`colecoes` possui slug único, descrição, imagem de referência, publicação, ativa e destaque. Produtos se relacionam a coleções por `produto_colecoes`, permitindo múltiplas coleções sem duplicar campos no produto.

### Produtos

`produtos` guarda identidade editorial, categoria, descrição, materiais, medidas, cuidados, prazo de produção, status, destaque, novidade e SEO. A publicação pública exige `status='ACTIVE'` e ao menos uma variante ativa.

### Variantes e preço

O preço é propriedade da variante. Essa decisão evita conflito entre um “preço base” e preços próprios de cor/tamanho. A listagem calcula “a partir de” com o menor preço efetivo entre as variantes ativas.

Cada variante possui SKU único e estável, nome, atributos JSON, preço `NUMERIC(12,2)`, promoção opcional, estoque, estoque reservado e flag ativa. O estoque disponível é `estoque - estoque_reservado`; constraints impedem negativos e reserva acima do estoque.

### Imagens

O PostgreSQL guarda URLs e metadados, não arquivos binários. O índice parcial `produto_imagens_uma_principal_uk` garante no máximo uma imagem principal por produto. A API ordena principal, ordem e id. O frontend oferece imagem principal e galeria acessível.

## Seed de desenvolvimento

`database/seeds/development/001_catalog_demo.sql` cria dados explicitamente marcados como **DADOS DE DESENVOLVIMENTO**:

- categoria: Brincos;
- coleção: Demonstração;
- produto: Brinco Floral em Resina;
- slug: `brinco-floral-em-resina-demo`;
- variantes: Rosa, Azul e Branco;
- SKUs: prefixo `DEV-`;
- preços, estoques e imagens: exclusivamente demonstrativos.

O seed usa `ON CONFLICT` e verificações por URL. Duas execuções resultam em um produto, uma coleção, três variantes, duas imagens, um vínculo e uma única imagem principal. O runner recusa produção, banco `_test` e qualquer banco diferente de `brinco_de_princesa`.

## API pública

- `GET /api/v1/products`: somente produtos ativos, com variante ativa, preço do servidor, categoria, estoque e imagem principal;
- `GET /api/v1/products/:slug`: produto ativo, categoria, coleções ativas, variantes ativas com estoque disponível e imagens;
- `GET /api/v1/catalog/categories`: categorias ativas e contagem de produtos ativos;
- `GET /api/v1/catalog/collections`: coleções ativas e contagem de produtos ativos;
- inexistentes retornam 404 controlado;
- slugs, paginação, limites, filtros e ordenação são validados;
- toda entrada externa permanece em parâmetros `$1`, `$2` etc.; ordenação usa allowlist interna.

Nenhum endpoint administrativo foi criado.

## Frontend

### Loja

A Loja apresenta loading, erro de API, vazio real, vazio por filtro e grid de produtos. Cada card exibe imagem, nome, categoria, preço do servidor, disponibilidade e link. Dados de desenvolvimento recebem selo explícito.

### Produto

A página mostra nome, categoria, preço da variante, descrição, galeria, coleção, fatos do produto, variantes por botões com estado `aria-pressed`, estoque disponível e estado da seleção. O foco da variante é visível. O botão de compra é desabilitado e informa que a compra pertence a uma fase futura; não existe simulação de carrinho.

### Responsividade e acessibilidade

Loja e Produto foram preparados para 320, 375, 390, 768, 1024 e 1440 px, com grids progressivos, imagens responsivas e fatos empilhados em telas estreitas. Imagens possuem texto alternativo; galeria e variantes usam botões nomeados com `aria-pressed`, operáveis por Enter e Espaço; foco usa cor de contraste maior.

## Testes

Foram adicionados testes para:

- ordenação, nome e checksum de migrations;
- versão duplicada e arquivo inválido;
- aplicação e registro da baseline;
- segunda execução sem reaplicação;
- detecção de checksum alterado;
- rollback integral em erro;
- seed executado duas vezes sem duplicações;
- três SKUs únicos, estoque não negativo, duas imagens e uma principal;
- produto, variantes, imagens, categoria, coleção e exclusão pública de produto arquivado.

Os testes PostgreSQL continuam restritos ao banco terminado em `_test` e limpam as fixtures. O banco de desenvolvimento não é usado pela suíte.

## Limites preservados

- estoque estrutural não significa reserva concorrente;
- preço demonstrativo não é preço oficial;
- imagens demonstrativas não representam fotografia comercial aprovada;
- carrinho, checkout, pagamento, autenticação, administração e cupons continuam em fases futuras.
