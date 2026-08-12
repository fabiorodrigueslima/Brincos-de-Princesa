import { describe, expect, it } from 'vitest'
import { commercialCategories } from './commercialCatalog.js'

describe('commercial catalog routes', () => {
  it.each([['brincos','Brincos artesanais'],['aneis','Anéis artesanais'],['colares','Colares artesanais'],['pulseiras','Pulseiras artesanais']])('defines unique metadata for %s', (slug, title) => {
    expect(commercialCategories[slug]).toMatchObject({ title })
    expect(commercialCategories[slug].description.length).toBeGreaterThan(30)
  })
})
