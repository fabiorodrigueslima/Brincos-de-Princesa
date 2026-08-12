import { describe, expect, it } from 'vitest'
import { attributeEntries, categoryPath, effectivePrice, hasValidSale, productFacts } from './productViewModel.js'

describe('product view model', () => {
  it('uses the normal server price when there is no valid promotion', () => {
    expect(hasValidSale({ price: '120.00', salePrice: null })).toBe(false)
    expect(effectivePrice({ price: '120.00', salePrice: null })).toBe(120)
    expect(effectivePrice({ price: '120.00', salePrice: '140.00' })).toBe(120)
  })

  it('uses a lower valid promotional price', () => {
    expect(hasValidSale({ price: '120.00', salePrice: '90.00' })).toBe(true)
    expect(effectivePrice({ price: '120.00', salePrice: '90.00' })).toBe(90)
  })

  it('turns flexible primitive attributes into public labels', () => {
    expect(attributeEntries({ acabamento: 'Fosco', tipo_de_fecho: 'Gancho', interno: null, objeto: { x: 1 } })).toEqual([
      { name: 'Acabamento', value: 'Fosco' },
      { name: 'Tipo De Fecho', value: 'Gancho' },
    ])
  })

  it('omits all absent optional facts instead of inventing values', () => {
    expect(productFacts({ materials: null, dimensions: '', weightGrams: null, productionDays: 0 }, { attributes: {} })).toEqual([])
  })

  it('combines real product and selected variant details', () => {
    expect(productFacts({ materials: 'Cerâmica', dimensions: '3 cm', weightGrams: 8, productionDays: 5 }, { attributes: { acabamento: 'Brilhante' } })).toEqual([
      { name: 'Materiais', value: 'Cerâmica' }, { name: 'Medidas', value: '3 cm' }, { name: 'Peso', value: '8 g' }, { name: 'Produção', value: 'Até 5 dias' }, { name: 'Acabamento', value: 'Brilhante' },
    ])
  })

  it('keeps only known commercial categories in direct routes', () => {
    expect(categoryPath({ slug: 'brincos' })).toBe('/brincos')
    expect(categoryPath({ slug: 'outros' })).toBe('/loja')
  })
})
