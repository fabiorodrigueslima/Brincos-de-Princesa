import { Component } from 'react'

export class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error({
      event: 'REACT_RENDER_ERROR',
      errorName: error.name,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <img src="/brand/brinco-de-princesa-logo.png" alt="" />
          <p className="eyebrow">Brinco de Princesa</p>
          <h1>Esta página encontrou um imprevisto.</h1>
          <p>Você pode voltar ao início e continuar navegando com segurança.</p>
          <a className="button button-primary" href="/">Voltar ao início</a>
        </main>
      )
    }

    return this.props.children
  }
}
