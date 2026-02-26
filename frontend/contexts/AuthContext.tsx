'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '@/services/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name: string
  phone?: string
  avatar?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  isVerified?: boolean
  isHost?: boolean
  role?: string
  createdAt?: string
  rating?: number
  reviewCount?: number
  emailNotificationsBookings?: boolean
  smsNotifications?: boolean
  marketingEmails?: boolean
  profileVisible?: boolean
  allowReviews?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithToken: (token: string) => Promise<boolean>
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    isHost?: boolean,
    province?: string
  ) => Promise<{ success: boolean; waitlist?: boolean }>
  logout: () => Promise<void>
  updateProfile: (profileData: Partial<User>) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (token) {
        try {
          const response = await apiService.getMe()
          if (response.data?.user) {
            setUser(response.data.user)
          } else {
            localStorage.removeItem('auth_token')
            setUser(null)
          }
        } catch (error) {
          localStorage.removeItem('auth_token')
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const response = await apiService.login({ email, password })
      if (response.data?.user && response.data?.token) {
        localStorage.setItem('auth_token', response.data.token)
        setUser(response.data.user)
        setIsLoading(false)
        return { success: true }
      }
      setIsLoading(false)
      return { success: false, error: response.message || 'Login failed' }
    } catch (error: any) {
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      const errorMessage =
        error?.response?.data?.message || error?.message || 'An error occurred during login'
      return { success: false, error: errorMessage }
    }
  }

  const loginWithToken = async (token: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      localStorage.setItem('auth_token', token)
      const response = await apiService.getMe()
      if (response.success && response.data?.user) {
        setUser(response.data.user)
        setIsLoading(false)
        return true
      }
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return false
    } catch (error: any) {
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return false
    }
  }

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    isHost: boolean = false,
    province?: string
  ): Promise<{ success: boolean; waitlist?: boolean }> => {
    setIsLoading(true)
    try {
      const response = await apiService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        isHost,
        province,
      })

      const data = response.data as { user?: any; token?: string; waitlist?: boolean } | undefined
      const userData = data?.user ?? response.data?.user
      const token = data?.token ?? response.data?.token

      if (response.success && data?.waitlist) {
        setIsLoading(false)
        return { success: true, waitlist: true }
      }

      if (response.success && userData) {
        if (token) {
          localStorage.setItem('auth_token', token)
          setUser(userData)
        }
        setIsLoading(false)
        return { success: true }
      }

      if (userData) {
        if (token) {
          localStorage.setItem('auth_token', token)
          setUser(userData)
        }
        setIsLoading(false)
        return { success: true }
      }
      setIsLoading(false)
      return { success: false }
    } catch (error: any) {
      const res = error?.response?.data
      if (res?.success && res?.waitlist) {
        setIsLoading(false)
        return { success: true, waitlist: true }
      }
      if (res?.success && (res?.data?.user || res?.user)) {
        setIsLoading(false)
        return { success: true }
      }
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return { success: false }
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } catch (error) {
      // silently handled
    } finally {
      localStorage.removeItem('auth_token')
      setUser(null)
    }
  }

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      const response = await apiService.updateProfile(profileData)
      if (response.data?.user) {
        setUser(response.data.user)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      try {
        const response = await apiService.getMe()
        if (response.data?.user) {
          setUser(response.data.user)
        }
      } catch (error) {
        // silently handled
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithToken,
        signup,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
