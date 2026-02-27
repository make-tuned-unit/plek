'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { apiService } from '@/services/api'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithToken } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [isSessionError, setIsSessionError] = useState(false)
  const didRun = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || didRun.current) return
    const token = searchParams.get('token')
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const token_hash = searchParams.get('token_hash')
    const supabaseToken = searchParams.get('token')
    const type = searchParams.get('type')
    const email = searchParams.get('email')

    // Token_hash + token: verify via API (fetch with Accept: application/json for no full-page redirect)
    if (token_hash && supabaseToken && type && !success) {
      didRun.current = true
      const params = new URLSearchParams({
        token_hash: token_hash,
        token: supabaseToken,
        type: type,
        ...(email && { email: email })
      })
      fetch(`/api/auth/confirm-email?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data?.success && data?.data?.token) {
            await loginWithToken(data.data.token)
            setStatus('success')
            setMessage('You\'re all set!')
            const redirectTo = localStorage.getItem('plekk_auth_redirect') || '/profile'
            localStorage.removeItem('plekk_auth_redirect')
            if (typeof window?.history?.replaceState === 'function') {
              window.history.replaceState({}, '', window.location.pathname)
            }
            setTimeout(() => router.replace(redirectTo), 1000)
          } else if (data?.success && data?.error === 'session') {
            setIsSessionError(true)
            setStatus('error')
            setMessage('You\'re confirmed! Sign in below to continue.')
          } else {
            setStatus('error')
            setMessage('This link may have expired or already been used. Try signing in—if you\'re already confirmed, you\'ll get in.')
          }
        })
        .catch(() => {
          setStatus('error')
          setMessage('Something went wrong. Try signing in or request a new confirmation email below.')
        })
      return
    }

    // Handle Supabase redirect with tokens in hash (e.g. #access_token=...&type=signup)
    const hash = window.location.hash?.slice(1)
    if (!token && !success && hash) {
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      if (accessToken && (hashParams.get('type') === 'signup' || hashParams.get('type') === 'email')) {
        didRun.current = true
        fetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        })
          .then((r) => r.json())
          .then(async (data) => {
            if (data?.success && data?.data?.token) {
              await loginWithToken(data.data.token)
              setStatus('success')
              setMessage('You\'re all set!')
              const redirectTo = localStorage.getItem('plekk_auth_redirect') || '/profile'
              localStorage.removeItem('plekk_auth_redirect')
              if (typeof window?.history?.replaceState === 'function') {
                window.history.replaceState({}, '', window.location.pathname)
              }
              setTimeout(() => router.replace(redirectTo), 1000)
            } else {
              setStatus('error')
              setMessage('This link may have expired or already been used. Try signing in—if your email is already confirmed, you\'ll get in.')
            }
          })
          .catch(() => {
            setStatus('error')
            setMessage('We couldn\'t complete confirmation. Try signing in or request a new confirmation email below.')
          })
        return
      }
    }

    if (success === 'true' && token) {
      didRun.current = true
      loginWithToken(token)
        .then(() => {
          setStatus('success')
          setMessage('You\'re all set!')
          const redirectTo = localStorage.getItem('plekk_auth_redirect') || '/profile'
          localStorage.removeItem('plekk_auth_redirect')
          if (typeof window?.history?.replaceState === 'function') {
            window.history.replaceState({}, '', window.location.pathname)
          }
          setTimeout(() => router.replace(redirectTo), 1000)
        })
        .catch(() => {
          setStatus('error')
          setMessage('Email confirmed! Please sign in below to continue.')
        })
    } else if (success === 'false' || error) {
      didRun.current = true
      setStatus('error')
      if (error === 'session') {
        setIsSessionError(true)
        setMessage('You\'re confirmed! Sign in below to continue.')
      } else if (error === 'invalid') {
        setMessage('This link may have expired or already been used. If you already clicked it once (or your email client opened it), your email is likely confirmed—try signing in below.')
      } else {
        setMessage('We couldn\'t confirm your email with this link. It may have expired or already been used. Try signing in—if your email is already confirmed, you\'ll get in.')
      }
    } else {
      didRun.current = true
      setStatus('error')
      setMessage('We couldn\'t verify your link—this sometimes happens when opening from an email app. You can request a new link below or try signing in if you\'ve already confirmed.')
    }
  }, [searchParams, loginWithToken, router])

  const handleResend = async () => {
    const email = resendEmail.trim()
    if (!email || resending) return
    setResending(true)
    try {
      const res = await apiService.resendConfirmation(email)
      setResendSent(true)
      if (res.success) setMessage('If that email is registered and not yet confirmed, we\'ve sent a new link.')
    } catch {
      setMessage('Something went wrong. Try again or sign in if you\'re already confirmed.')
    }
    setResending(false)
  }

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
            <h1 className="text-2xl font-bold text-charcoal-900 mb-4">You&apos;re in!</h1>
            <p className="text-charcoal-600 mb-6">{message}</p>
            <p className="text-sm text-charcoal-500">Taking you to your account...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-charcoal-300 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-charcoal-900 mb-4">We couldn&apos;t verify your link</h1>
            <p className="text-charcoal-600 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              {isSessionError ? (
                <Link
                  href="/auth/signin"
                  className="w-full py-3 rounded-lg font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors text-center"
                >
                  Sign in
                </Link>
              ) : !resendSent ? (
                <div className="space-y-2">
                  <p className="text-sm text-charcoal-600">Get a new confirmation link</p>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-mist-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !resendEmail.trim()}
                    className="w-full py-3 rounded-lg font-semibold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                  >
                    {resending ? 'Sending…' : 'Email me a new link'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-charcoal-600 py-2">Check your inbox (and spam) for the new link.</p>
              )}
              {!isSessionError && (
                <Link
                  href="/auth/signin"
                  className="py-2.5 text-accent-600 hover:text-accent-700 font-medium text-center"
                >
                  Already confirmed? Sign in →
                </Link>
              )}
              <Link
                href="/auth/signup"
                className="text-sm text-charcoal-500 hover:text-charcoal-700 text-center"
              >
                Sign up with a different email
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
