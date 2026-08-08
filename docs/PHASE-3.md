# Fase 3 — Site institucional

Status: concluída em 8 de agosto de 2026.

## Páginas implementadas

- `/` — Home completa;
- `/sobre` — Nossa História;
- `/colecoes` — apresentação editorial das coleções;
- `/loja` — estado transparente de preparação do catálogo;
- `/personalizados` — processo e condições preliminares;
- `/como-e-feito` — processo artesanal em cinco etapas;
- `/contato` — situação atual dos canais oficiais;
- `/privacidade` — política preliminar contextual;
- `/termos` — termos preliminares;
- `/trocas-e-devolucoes` — política preliminar;
- página 404.

## Interface

- Header fixo, navegação desktop e menu mobile acessível.
- Logo oficial no header, footer e favicon.
- Paleta vinho, marfim, bege e dourado em variáveis CSS.
- Hierarquia tipográfica com fallback serifado configurável; nenhuma fonte oficial foi inventada.
- Home com hero, valores, coleções, história, processo, personalizados e CTA.
- Rodapé completo com navegação e transparência.
- Breakpoints para desktop, tablet e mobile, incluindo largura mínima de 320 px.
- Estados de foco, link para pular ao conteúdo e respeito a `prefers-reduced-motion`.

## Imagens provisórias

Foram criadas três fotografias editoriais conceituais com a ferramenta integrada de geração de imagens e salvas como WebP no projeto:

- `frontend/public/images/hero-artesanal.webp`;
- `frontend/public/images/processo-artesanal.webp`;
- `frontend/public/images/pecas-personalizadas.webp`.

Elas não representam produtos reais nem a artesã real. O site informa essa condição onde necessário, e os ativos deverão ser substituídos ou validados antes da publicação comercial. Os prompts pediram fotografia artesanal sem texto, logo, marca d'água ou imitação de marca.

## Conteúdo e privacidade

- Nenhum preço, produto, estoque ou depoimento foi inventado.
- Nenhum formulário coleta dados enquanto canal, retenção e proteção contra abuso não estiverem definidos.
- Nenhum perfil social, telefone ou e-mail foi inventado.
- Não foram adicionados analytics, marketing ou fontes externas.
- As políticas são explicitamente preliminares e precisam de revisão antes da abertura comercial.

## SEO inicial

- Idioma `pt-BR`;
- title e description específicos por rota;
- metadados Open Graph básicos;
- favicon e theme color;
- URLs semânticas;
- `robots.txt`.

Canonical, sitemap absoluto e dados estruturados dependem do domínio definitivo e do catálogo real.

## Verificações

- lint frontend: aprovado;
- lint backend: aprovado;
- 8 testes automatizados do backend/banco: aprovados;
- build Vite de produção: aprovado;
- 39 módulos transformados;
- imagens reduzidas de aproximadamente 6,7 MB em PNG para cerca de 406 KB em WebP.

A inspeção visual automatizada no navegador integrado foi tentada, mas o navegador isolado não conseguiu acessar o servidor local, apesar de a porta estar ativa no host. Portanto, não há alegação de aprovação visual automatizada. A revisão visual deve ser feita localmente com `npm run dev`.

## Próxima fase

Fase 4: API e administração do catálogo real, incluindo categorias, coleções, produtos, variantes, estoque e referências de imagens.
