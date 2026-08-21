import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { apiPost } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId, token) {
    let accessToken = token
    if (!accessToken) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) accessToken = session.access_token
      } catch {}
    }
    const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    const supaPromise = supabase.from('profiles').select('*').eq('id', userId).single().then(r => r.data).catch(() => null)
    const apiPromise = fetch(`${import.meta.env.VITE_API_URL}/profile/${userId}`, { headers: authHeaders }).then(r => r.ok ? r.json() : null).catch(() => null)
    const [supaData, apiData] = await Promise.all([supaPromise, apiPromise])
    if (supaData || apiData) return { ...supaData, ...apiData }
    return null
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (profile) setUser({ id: session.user.id, email: session.user.email, ...profile })
          else setUser({ id: session.user.id, email: session.user.email })
        }
      } catch {}
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'TOKEN_REFRESHED') {
          return
        } else if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setUser(prev => {
            const updated = profile ? { id: session.user.id, email: session.user.email, ...profile } : { id: session.user.id, email: session.user.email }
            return updated
          })
        }
      } catch {}
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid')) return { ok: false, reason: 'invalid' }
      if (error.message.toLowerCase().includes('not confirmed')) return { ok: false, reason: 'unconfirmed' }
      return { ok: false, reason: error.message }
    }
    if (data?.user) {
      const token = data.session?.access_token
      const profile = await fetchProfile(data.user.id, token)
      const userData = profile
        ? { id: data.user.id, email: data.user.email, ...profile }
        : { id: data.user.id, email: data.user.email }
      setUser(userData)
      return { ok: true, user: userData }
    }
    return { ok: true }
  }

  const register = async (name, email, password, phone) => {
    try {
      const result = await apiPost('/register', { name, email, password, phone })
      return { ok: true, user: result.user }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  const logout = async () => {
    try { await fetch('/api/notifications/read-all', { method: 'PUT', headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }) } catch {}
    await supabase.auth.signOut()
    setUser(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) throw new Error(error.message)
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  }

  const changePassword = async (currentPassword, newPassword) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: currentPassword,
    })
    if (signInError) return { ok: false, reason: 'Current password is incorrect' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  }

  const refreshUser = async () => {
    if (!user?.id) return
    const profile = await fetchProfile(user.id)
    if (profile) setUser(prev => ({ ...prev, ...profile }))
  }

  const updateProfile = (data) => {
    setUser(prev => ({ ...prev, ...data }))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, resetPassword, updatePassword, changePassword, refreshUser, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
