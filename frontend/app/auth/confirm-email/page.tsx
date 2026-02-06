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
        setMessage('This link may have expired or already been used. If you already clicked it once (or your email client opened it), your email is likely confirmed—try signing in below.')
      } else {
        setMessage('We couldn\'t confirm your email with this link. It may have expired or already been used. Try signing in—if your email is already confirmed, you\'ll get in.')
      }
    } else {
      // No token - e.g. opened confirm page without coming from the email link
      setStatus('error')
      setMessage('No confirmation data was found. Use the link from your confirmation email, or try signing in if you\'ve already confirmed.')
    }
  }, [searchParams, loginWithToken, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-accent-500 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-charcoal-900 mb-4">Confirming your email...</h1>
            <p className="text-charcoal-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-accent-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-charcoal-900 mb-4">Email Confirmed!</h1>
            <p className="text-charcoal-600 mb-6">{message}</p>
            <p className="text-sm text-charcoal-500">Redirecting you to your profile...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-charcoal-900 mb-4">Confirmation Failed</h1>
            <p className="text-charcoal-600 mb-6">{message}</p>
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
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="h-16 w-16 text-accent-500 mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-bold text-charcoal-900 mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
