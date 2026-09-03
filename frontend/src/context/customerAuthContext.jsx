/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { customerLogin, customerLogout, customerMe, customerRegister } from '../services/api.js'

const CustomerAuthContext = createContext(null)
const guestSession = {
  user: null,
  csrfToken: '',
  loading: false,
  refresh: async () => null,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
}

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, csrfToken: '', loading: true })

  const refresh = useCallback(async (signal) => {
    try {
      const response = await customerMe(signal)
      setSession({ user: response.data.profile, csrfToken: response.data.csrfToken, loading: false })
      return response.data.profile
    } catch (error) {
      if (error.name === 'AbortError') throw error
      setSession({ user: null, csrfToken: '', loading: false })
      return null
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // A sessão inicial é sincronizada com a API externa ao ciclo de renderização.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(controller.signal).catch(() => {})
    return () => controller.abort()
  }, [refresh])

  const signIn = async (credentials) => {
    const response = await customerLogin(credentials)
    setSession({ user: response.data.user, csrfToken: response.data.csrfToken, loading: false })
    return response.data.user
  }

  const signUp = async (credentials) => {
    const response = await customerRegister(credentials)
    setSession({ user: response.data.user, csrfToken: response.data.csrfToken, loading: false })
    return response.data.user
  }

  const signOut = async () => {
    if (session.csrfToken) await customerLogout(session.csrfToken)
    setSession({ user: null, csrfToken: '', loading: false })
  }

  const value = { ...session, refresh, signIn, signUp, signOut }
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  return context ?? guestSession
}
