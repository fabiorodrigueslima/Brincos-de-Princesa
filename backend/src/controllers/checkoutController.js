import { postalCodeProvider } from '../providers/postalCodeProvider.js'
import { checkoutService } from '../services/checkoutService.js'

export async function lookupPostalCode(req, res) {
  res.json({ data: await postalCodeProvider.lookup(req.validated.params.postalCode) })
}

export async function quoteCheckout(req, res) {
  res.json({ data: await checkoutService.quote(req.validated.body) })
}
