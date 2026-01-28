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
    isHost?: boolean
  ) => Promise<boolean>
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
          console.error('Auth check failed:', error)
          localStorage.removeItem('auth_token')
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await apiService.login({ email, password })
      if (response.data?.user && response.data?.token) {
        localStorage.setItem('auth_token', response.data.token)
        setUser(response.data.user)
        setIsLoading(false)
        return true
      }
      setIsLoading(false)
      return false
    } catch (error) {
      console.error('Login failed:', error)
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return false
    }
  }

  const loginWithToken = async (token: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      console.log('Storing token and fetching user...')
      localStorage.setItem('auth_token', token)
      const response = await apiService.getMe()
      console.log('getMe response:', { success: response.success, hasUser: !!response.data?.user })
      if (response.success && response.data?.user) {
        setUser(response.data.user)
        setIsLoading(false)
        console.log('Login successful, user set:', response.data.user.email)
        return true
      }
      console.warn('getMe failed or no user data:', response)
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return false
    } catch (error: any) {
      console.error('Login with token failed:', error)
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      })
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
    isHost: boolean = false
  ): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await apiService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        isHost,
      })

      // Handle both cases: with token (old flow) or without token (email confirmation required)
      // Response structure: { success: true, data: { user: {...}, token?: "..." }, message?: "..." }
      const userData = response.data?.user;
      const token = response.data?.token;
      
      if (response.success && userData) {
        if (token) {
          localStorage.setItem('auth_token', token)
          setUser(userData)
        }
        // If no token, user needs to confirm email - still return true to show success message
        setIsLoading(false)
        return true
      }
      
      // Fallback: check if response has user data directly
      if (userData) {
        if (token) {
          localStorage.setItem('auth_token', token)
          setUser(userData)
        }
        setIsLoading(false)
        return true
      }
      setIsLoading(false)
      return false
    } catch (error: any) {
      console.error('Signup failed:', error)
      // Check if it's actually a success response (email confirmation required)
      // Sometimes the API returns success but axios/fetch treats it as an error
      if (error?.response?.data?.success && (error?.response?.data?.data?.user || error?.response?.data?.user)) {
        setIsLoading(false)
        return true // Return true so UI can show "check your email" message
      }
      localStorage.removeItem('auth_token')
      setIsLoading(false)
      return false
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } catch (error) {
      console.error('Logout failed:', error)
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
      console.error('Profile update failed:', error)
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
        console.error('Failed to refresh user:', error)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithToken, signup, logout, updateProfile, refreshUser }}>
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
