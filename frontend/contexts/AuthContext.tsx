'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fake user credentials for demo
const FAKE_USERS = [
  { email: 'demo@example.com', password: 'password123', name: 'Demo User' },
  { email: 'test@example.com', password: 'test123', name: 'Test User' },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem('drivemyway_user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check against fake credentials
    const fakeUser = FAKE_USERS.find(u => u.email === email && u.password === password)
    
    if (fakeUser) {
      const userData: User = {
        id: `user_${Date.now()}`,
        email: fakeUser.email,
        name: fakeUser.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fakeUser.name}`
      }
      
      setUser(userData)
      localStorage.setItem('drivemyway_user', JSON.stringify(userData))
      setIsLoading(false)
      return true
    }
    
    setIsLoading(false)
    return false
  }

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if user already exists
    const existingUser = FAKE_USERS.find(u => u.email === email)
    if (existingUser) {
      setIsLoading(false)
      return false
    }
    
    // Create new user
    const userData: User = {
      id: `user_${Date.now()}`,
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    }
    
    setUser(userData)
    localStorage.setItem('drivemyway_user', JSON.stringify(userData))
    setIsLoading(false)
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('drivemyway_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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