import { cartService } from '../services/cartService.js'

export async function validateCart(req, res) {
  res.json({ data: await cartService.validate(req.validated.body.items) })
}
