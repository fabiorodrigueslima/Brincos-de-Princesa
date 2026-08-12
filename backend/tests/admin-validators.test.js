import { describe, expect, it } from 'vitest'
import { productSchema, stockSchema, variantSchema } from '../src/validators/adminValidators.js'

describe('admin strict validation', () => {
  it('rejects stored script fields through mass-assignment',()=>expect(productSchema.safeParse({name:'Produto',slug:'produto',description:'<script>x</script>',productionDays:0,status:'DRAFT',html:'<script>x</script>'}).success).toBe(false))
  it('rejects invalid price, promotion and negative stock',()=>{expect(variantSchema.safeParse({name:'Única',sku:'A',price:'10.00',salePrice:'11.00',stock:1,active:true,attributes:{}}).success).toBe(false);expect(variantSchema.safeParse({name:'Única',sku:'A',price:'10.00',stock:-1,active:true,attributes:{}}).success).toBe(false)})
  it('requires a traceable nonzero stock movement',()=>{expect(stockSchema.safeParse({delta:0,reason:'ajuste'}).success).toBe(false);expect(stockSchema.safeParse({delta:2,reason:'Entrada conferida'}).success).toBe(true)})
})
