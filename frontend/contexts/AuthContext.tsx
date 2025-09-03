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
  zip_code?: string
  country?: string
  is_verified?: boolean
  is_host?: boolean
  role?: string
  total_bookings?: number
  total_earnings?: number
  rating?: number
  review_count?: number
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (profileData: Partial<User>) => Promise<boolean>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth token and validate it
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          const response = await apiService.getMe()
          if (response.data?.user) {
            setUser(response.data.user)
          } else {
            // Invalid token, remove it
            localStorage.removeItem('auth_token')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('auth_token')
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
        const userData = response.data.user
        const token = response.data.token
        
        // Store token and user data
        localStorage.setItem('auth_token', token)
        setUser(userData)
        setIsLoading(false)
        return true
      }
      
      setIsLoading(false)
      return false
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
      return false
    }
  }

  const signup = async (email: string, password: string, firstName: string, lastName: string, phone: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      const response = await apiService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
      })
      
      if (response.data?.user && response.data?.token) {
        const userData = response.data.user
        const token = response.data.token
        
        // Store token and user data
        localStorage.setItem('auth_token', token)
        setUser(userData)
        setIsLoading(false)
        return true
      }
      
      setIsLoading(false)
      return false
    } catch (error) {
      console.error('Signup failed:', error)
      setIsLoading(false)
      return false
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local data
      setUser(null)
      localStorage.removeItem('auth_token')
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

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 