import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  setUserName: (name: string) => void
}

const STORAGE_KEY = 'medAlias:user'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const createId = (): string =>
  Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser
        if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
          setUser(parsed)
        }
      }
    } catch {
      // ignore malformed localStorage data
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persistUser = (next: AuthUser) => {
    setUser(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const setUserName = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return

      if (user) {
        if (user.name === trimmed) return
        persistUser({ ...user, name: trimmed })
      } else {
        const nextUser: AuthUser = {
          id: createId(),
          name: trimmed,
        }
        persistUser(nextUser)
      }
    },
    [user],
  )

  const value: AuthContextValue = {
    user,
    isLoading,
    setUserName,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

