'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { loginWithToken } = useAuth()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const didComplete = useRef(false)

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return
      if (didComplete.current) return
      const hash = window.location.hash
      if (!hash) {
        didComplete.current = true
        setStatus('error')
        toast.error('No sign-in data received. Please try again.')
        router.replace('/auth/signin')
        return
      }
      const params = new URLSearchParams(hash.slice(1))
      const accessToken = params.get('access_token')
      if (!accessToken) {
        didComplete.current = true
        setStatus('error')
        toast.error('Invalid sign-in response. Please try again.')
        router.replace('/auth/signin')
        return
      }
      try {
        const res = await apiService.googleAuth(accessToken)
        if (res.success && res.data?.token) {
          const ok = await loginWithToken(res.data.token)
          if (ok && !didComplete.current) {
            didComplete.current = true
            toast.success('Signed in with Google!')
            router.replace('/profile')
            return
          }
        }
      } catch (_) {
        // Handled below
      }
      if (!didComplete.current) {
        didComplete.current = true
        setStatus('error')
        toast.error('Could not complete sign-in. Please try again.')
        router.replace('/auth/signin')
      }
    }
    run()
  }, [router, loginWithToken])

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-mist-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Completing sign-in...</h1>
          </>
        )}
        {status === 'error' && (
          <h1 className="text-xl font-bold text-gray-900">Redirecting...</h1>
        )}
      </div>
    </div>
  )
}
