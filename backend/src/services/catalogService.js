import { catalogRepository } from '../repositories/catalogRepository.js'
import { productRepository } from '../repositories/productRepository.js'
import { AppError } from '../utils/AppError.js'

function categoryDto(row) {
  return {
    id: row.id,
    name: row.nome,
    slug: row.slug,
    description: row.descricao,
    productCount: row.quantidade_produtos,
  }
}

function collectionDto(row) {
  return {
    id: row.id,
    name: row.nome,
    slug: row.slug,
    description: row.descricao,
    imageUrl: row.imagem_url,
    featured: row.destaque,
    productCount: row.quantidade_produtos,
  }
}

function productCardDto(row) {
  return {
    id: row.id,
    name: row.nome,
    slug: row.slug,
    description: row.descricao,
    category: row.categoria_slug ? { name: row.categoria_nome, slug: row.categoria_slug } : null,
    price: row.menor_preco,
    originalPrice: row.preco_original,
    inStock: row.em_estoque,
    isNew: row.novidade,
    featured: row.destaque,
    image: row.imagem_url ? { url: row.imagem_url, alt: row.imagem_alt } : null,
  }
}

export function createCatalogService({ categories = catalogRepository, products = productRepository } = {}) {
  return {
    async listCategories() {
      return (await categories.listCategories()).map(categoryDto)
    },

    async listCollections() {
      return (await categories.listCollections()).map(collectionDto)
    },

    async getCollection(slug) {
      const collection = await categories.findCollectionBySlug(slug)
      if (!collection) throw new AppError(404, 'COLLECTION_NOT_FOUND', 'Coleção não encontrada.')
      return collectionDto(collection)
    },

    async listProducts(filters) {
      const result = await products.list(filters)
      return {
        items: result.rows.map(productCardDto),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit),
        },
      }
    },

    async getProduct(slug) {
      const result = await products.findBySlug(slug)
      if (!result) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.')

      const { product, variants, images, collections } = result
      return {
        id: Number(product.id),
        name: product.nome,
        slug: product.slug,
        description: product.descricao,
        materials: product.materiais,
        dimensions: product.medidas,
        weightGrams: product.peso_gramas,
        care: product.cuidados,
        productionDays: product.prazo_producao_dias,
        isNew: product.novidade,
        featured: product.destaque,
        category: product.categoria_slug ? { name: product.categoria_nome, slug: product.categoria_slug } : null,
        seo: { title: product.meta_title, description: product.meta_description },
        variants: variants.map((variant) => ({
          id: Number(variant.id),
          sku: variant.sku,
          name: variant.nome,
          attributes: variant.atributos,
          price: variant.preco,
          salePrice: variant.preco_promocional,
          availableStock: variant.estoque_disponivel,
          inStock: variant.estoque_disponivel > 0,
        })),
        images: images.map((image) => ({
          id: Number(image.id),
          variantId: image.variante_id == null ? null : Number(image.variante_id),
          url: image.url,
          alt: image.alt_text,
          width: image.largura_px,
          height: image.altura_px,
          order: image.ordem,
          primary: image.principal,
        })),
        collections: collections.map((collection) => ({ name: collection.nome, slug: collection.slug })),
      }
    },
  }
}

export const catalogService = createCatalogService()
