import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AdminProfile } from '../types'
const AuthContext = createContext<{
  session: Session | null
  profile: AdminProfile | null
  loading: boolean
}>({ session: null, profile: null, loading: true })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    session: Session | null
    profile: AdminProfile | null
    loading: boolean
  }>({ session: null, profile: null, loading: !!supabase })
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!supabase) return
    let alive = true,
      revision = 0
    let currentUserId: string | null | undefined
    const sync = async (session: Session | null) => {
      const nextUserId = session?.user.id ?? null
      // Supabase can emit SIGNED_IN again on tab focus. Keep mounted forms and cache
      // for the same identity, including when only the access token changes.
      if (nextUserId === currentUserId) {
        setState((previous) => ({ ...previous, session }))
        return
      }
      const identityChanged = currentUserId !== undefined
      currentUserId = nextUserId
      const version = ++revision
      if (identityChanged) queryClient.clear()
      if (!session) {
        setState({ session: null, profile: null, loading: false })
        return
      }
      setState({ session, profile: null, loading: true })
      let profile: AdminProfile | null = null
      if (session) {
        const result = await supabase!
          .from('admin_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
        profile = result.data
      }
      if (alive && revision === version) {
        setState((previous) => ({ ...previous, profile, loading: false }))
      }
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive && revision === 0) void sync(error ? null : data.session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (alive) void sync(session)
      }, 0)
    })
    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [queryClient])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
