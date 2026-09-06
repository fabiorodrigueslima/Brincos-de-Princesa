export const orderStatusLabel = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  CANCELLED: 'Cancelado',
  IN_PRODUCTION: 'Em produção',
  READY_TO_SHIP: 'Pronto para envio',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  REFUNDED: 'Reembolsado',
  CHARGEBACK: 'Pagamento contestado — em análise',
}

export const canPollOrder = (status) => status === 'PENDING_PAYMENT'
