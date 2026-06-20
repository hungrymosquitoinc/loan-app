import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        // Merge with backend data for extended fields (kyc_status, images, etc.)
        try {
          const r = await fetch(`${import.meta.env.VITE_API_URL}/profile/${userId}`)
          if (r.ok) { const ext = await r.json(); return { ...data, ...ext } }
        } catch {}
        return data
      }
    } catch {}
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/profile/${userId}`)
      if (r.ok) return await r.json()
    } catch {}
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (profile) setUser({ id: session.user.id, email: session.user.email, ...profile })
          else setUser({ id: session.user.id, email: session.user.email })
        } else {
          setUser(null)
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
      return { ok: false, reason: error.message }
    }
    if (data?.user) {
      const profile = await fetchProfile(data.user.id)
      const userData = profile
        ? { id: data.user.id, email: data.user.email, ...profile }
        : { id: data.user.id, email: data.user.email }
      setUser(userData)
      return { ok: true, user: userData }
    }
    return { ok: true }
  }

  const register = async (name, email, password, phone) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    })
    if (result.error) {
      if (result.error.message.includes('already')) return false
      throw new Error(result.error.message)
    }
    if (result.data.user) {
      try {
        await supabase.from('profiles').insert({
          id: result.data.user.id,
          name,
          role: 'borrower',
          phone: phone || '',
          is_active: true,
        })
      } catch {
        throw new Error('Account created but profile setup failed. Contact support.')
      }
      return true
    }
    return false
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
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
    <AuthContext.Provider value={{ user, login, register, logout, changePassword, refreshUser, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
