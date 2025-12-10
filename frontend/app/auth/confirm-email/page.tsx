'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithToken } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check for Supabase redirect with hash fragment (e.g., #access_token=...)
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1)) // Remove the #
      const accessToken = hashParams.get('access_token')
      const expiresAt = hashParams.get('expires_at')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      if (accessToken) {
        console.log('Found Supabase token in hash, logging in...', { 
          hasToken: !!accessToken, 
          tokenLength: accessToken.length,
          type 
        })
        // Keep status as loading while processing
        setStatus('loading')
        // Use the token to log in (works for both signup and email confirmation)
        loginWithToken(accessToken)
          .then((success) => {
            console.log('Login result:', success)
            if (success) {
              setStatus('success')
              setMessage('Email confirmed! You are now logged in.')
              // Clear the hash from URL immediately
              window.history.replaceState(null, '', window.location.pathname)
              // Redirect to profile after 1.5 seconds
              setTimeout(() => {
                router.push('/profile')
              }, 1500)
            } else {
              setStatus('error')
              setMessage('Email confirmed, but login failed. Please try logging in manually.')
            }
          })
          .catch((err) => {
            console.error('Login error:', err)
            setStatus('error')
            setMessage('Email confirmed, but login failed. Please try logging in manually.')
          })
        return
      }
    }

    const token = searchParams.get('token')
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const token_hash = searchParams.get('token_hash')
    const supabaseToken = searchParams.get('token')
    const type = searchParams.get('type')
    const email = searchParams.get('email')

    // If we have token_hash and token from Supabase (direct link), redirect to backend for verification
    // This handles cases where Supabase redirects directly to frontend
    if (token_hash && supabaseToken && type && !success) {
      console.log('Redirecting to backend for token verification...')
      const backendUrl = '/api/auth/confirm-email'
      const params = new URLSearchParams({
        token_hash: token_hash,
        token: supabaseToken,
        type: type,
        ...(email && { email: email })
      })
      window.location.href = `${backendUrl}?${params.toString()}`
      return
    }

    if (success === 'true' && token) {
      // Log the user in with the token
      loginWithToken(token)
        .then(() => {
          setStatus('success')
          setMessage('Email confirmed! You are now logged in.')
          // Redirect to profile after 2 seconds
          setTimeout(() => {
            router.push('/profile')
          }, 2000)
        })
        .catch((err) => {
          console.error('Login error:', err)
          setStatus('error')
          setMessage('Email confirmed, but login failed. Please try logging in manually.')
        })
    } else if (success === 'false' || error) {
      setStatus('error')
      if (error === 'session') {
        setMessage('Email confirmed, but we couldn\'t log you in automatically. Please log in manually.')
      } else if (error === 'invalid') {
        setMessage('Invalid confirmation link. The link may be expired or already used.')
      } else {
        setMessage('Failed to confirm email. The link may be invalid or expired.')
      }
    } else if (!hash) {
      // Only show error if we don't have a hash (hash processing happens above)
      // Give a small delay to allow hash processing to complete
      setTimeout(() => {
        // Check again if status is still loading and no hash
        if (status === 'loading' && !window.location.hash) {
          setStatus('error')
          setMessage('Invalid confirmation link.')
        }
      }, 500)
    }
  }, [searchParams, loginWithToken, router, status])

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-accent-500 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirming your email...</h1>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-accent-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Confirmed!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting you to your profile...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirmation Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link
                href="/auth/signin"
                className="bg-accent-500 text-white px-6 py-3 rounded-lg hover:bg-accent-600 transition-colors font-semibold"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-accent-600 hover:text-accent-700 font-semibold"
              >
                Sign Up Again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}

