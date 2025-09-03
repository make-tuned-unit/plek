import { useState, useCallback } from 'react'
import { apiService } from '@/services/api'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

export function useApi<T = any>(options: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (apiCall: () => Promise<any>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiCall()
      setData(response.data)
      options.onSuccess?.(response.data)
      return response
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred'
      setError(errorMessage)
      options.onError?.(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  }
}

// Specific API hooks
export function useAuth() {
  return useApi()
}

export function useProperties() {
  return useApi()
}

export function useBookings() {
  return useApi()
}

export function useMessages() {
  return useApi()
}

export function useNotifications() {
  return useApi()
}
