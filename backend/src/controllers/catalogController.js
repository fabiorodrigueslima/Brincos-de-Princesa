import { catalogService } from '../services/catalogService.js'

export async function listCategories(_req, res) {
  res.json({ data: await catalogService.listCategories() })
}

export async function listCollections(_req, res) {
  res.json({ data: await catalogService.listCollections() })
}

export async function getCollection(req, res) {
  res.json({ data: await catalogService.getCollection(req.validated.params.slug) })
}

export async function listProducts(req, res) {
  const result = await catalogService.listProducts(req.validated.query)
  res.json({ data: result.items, pagination: result.pagination })
}

export async function getProduct(req, res) {
  res.json({ data: await catalogService.getProduct(req.validated.params.slug) })
}
