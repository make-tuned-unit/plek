'use client'

import { useMemo, useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  isHost: z.boolean().default(false),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignUpForm = z.infer<typeof signUpSchema>

function SignUpContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const redirectTarget = redirectParam ? decodeURIComponent(redirectParam) : null

  // Store redirect target in localStorage so email confirmation flow can use it
  if (redirectTarget && typeof window !== 'undefined') {
    localStorage.setItem('plekk_auth_redirect', redirectTarget)
  }
  const hostIntent = searchParams.get('host') === 'true' || searchParams.get('intent') === 'host'
  const checkEmail = searchParams.get('check-email') === 'true'
  const pendingEmail = searchParams.get('email') || ''
  const [isResending, setIsResending] = useState(false)
  const [resendEmailInput, setResendEmailInput] = useState('')
  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false)

  const defaultValues = useMemo(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isHost: hostIntent,
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  }), [hostIntent])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues
  })

  const onSubmit = async (data: SignUpForm) => {
    if (isSubmitting) return // Prevent double submission
    
    setIsSubmitting(true)
    
    try {
      const success = await signup(data.email, data.password, data.firstName, data.lastName, data.phone, data.isHost)
      if (success) {
        toast.success('Account created! Please check your email to confirm your account.', { duration: 5000 })
        const redirectQ = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''
        router.push(`/auth/signup?check-email=true&email=${encodeURIComponent(data.email)}${redirectQ}`)
      } else {
        toast.error('Failed to create account. Please try again.')
      }
    } catch (error: any) {
      // Check if it's a success response but without token (email confirmation required)
      if (error?.response?.data?.success && error?.response?.data?.message?.includes('check your email')) {
        toast.success('Account created! Please check your email to confirm your account.', { duration: 5000 })
        const redirectQ = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''
        router.push(`/auth/signup?check-email=true&email=${encodeURIComponent(data.email)}${redirectQ}`)
      } else {
        toast.error(error?.response?.data?.message || 'An error occurred during sign up')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show check email message if redirected here after successful signup
  if (checkEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-accent-600" />
            </div>
            <CheckCircle2 className="h-6 w-6 text-accent-500 mx-auto mb-4" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal-900 mb-4">Check your email</h1>
          <p className="text-charcoal-600 mb-6">
            We've sent a confirmation email to your inbox. Please click the link in the email to confirm your account and activate it.
          </p>
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-charcoal-700">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm text-charcoal-600 mt-2 text-left list-disc list-inside space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes - emails can take up to 5 minutes to arrive</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-accent-200">
              {pendingEmail ? (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={async () => {
                    setIsResending(true)
                    try {
                      await apiService.resendConfirmation(pendingEmail)
                      toast.success('If that email is not yet confirmed, we\'ve sent a new link.')
                    } catch {
                      toast.error('Could not resend. Try again in a few minutes.')
                    } finally {
                      setIsResending(false)
                    }
                  }}
                  className="text-accent-600 hover:text-accent-700 font-semibold text-sm disabled:opacity-50"
                >
                  {isResending ? 'Sending…' : 'Resend confirmation email'}
                </button>
              ) : (
                <div className="space-y-2 text-left">
                  <p className="text-sm text-charcoal-700 font-medium">Resend confirmation link</p>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={resendEmailInput}
                    onChange={(e) => setResendEmailInput(e.target.value)}
                    className="input w-full text-sm"
                  />
                  <button
                    type="button"
                    disabled={isResending || !resendEmailInput.trim()}
                    onClick={async () => {
                      if (!resendEmailInput.trim()) return
                      setIsResending(true)
                      try {
                        await apiService.resendConfirmation(resendEmailInput.trim())
                        toast.success('If that email is not yet confirmed, we\'ve sent a new link.')
                      } catch {
                        toast.error('Could not resend. Try again in a few minutes.')
                      } finally {
                        setIsResending(false)
                      }
                    }}
                    className="text-accent-600 hover:text-accent-700 font-semibold text-sm disabled:opacity-50"
                  >
                    {isResending ? 'Sending…' : 'Resend confirmation email'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-accent-600 hover:text-accent-700 font-semibold text-sm"
            >
              Try signing up again
            </button>
            <Link
              href={redirectParam ? `/auth/signin?redirect=${encodeURIComponent(redirectParam)}` : '/auth/signin'}
              className="text-charcoal-600 hover:text-charcoal-900 font-semibold text-sm"
            >
              Already confirmed? Sign in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-charcoal-900">Create your account</h1>
          <p className="mt-2 text-charcoal-600">
            {hostIntent
              ? 'Create an account to start listing your driveway.'
              : 'Join plekk and start earning from your driveway'}
          </p>

        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10 animate-scale-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-charcoal-700 mb-2">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                  <input
                    {...register('firstName')}
                    type="text"
                    id="firstName"
                    autoComplete="given-name"
                    className="input pl-10"
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-charcoal-700 mb-2">
                  Last name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                  <input
                    {...register('lastName')}
                    type="text"
                    id="lastName"
                    autoComplete="family-name"
                    className="input pl-10"
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-charcoal-700 mb-2">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                <input
                  {...register('phone')}
                  type="tel"
                  id="phone"
                  autoComplete="tel"
                  className="input pl-10"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('isHost')}
                  id="isHost"
                  type="checkbox"
                  className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isHost" className="text-charcoal-700">
                  I want to list my driveway and become a host
                </label>
                <p className="text-charcoal-500 mt-1">
                  Check this if you want to rent out your driveway to other drivers
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  className="input pl-10 pr-12"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="input pl-10 pr-12"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('acceptTerms')}
                  id="acceptTerms"
                  type="checkbox"
                  className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="acceptTerms" className="text-charcoal-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-accent-600 hover:text-accent-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-accent-600 hover:text-accent-500">
                    Privacy Policy
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-mist-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-charcoal-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleSignInButton disabled={!googleTermsAccepted} />
              <div className="flex items-start mt-3">
                <div className="flex items-center h-5">
                  <input
                    id="googleAcceptTerms"
                    type="checkbox"
                    checked={googleTermsAccepted}
                    onChange={(e) => setGoogleTermsAccepted(e.target.checked)}
                    className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="googleAcceptTerms" className="text-charcoal-700 cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" className="text-accent-600 hover:text-accent-500">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-accent-600 hover:text-accent-500">
                      Privacy Policy
                    </Link>{' '}
                    to continue with Google
                  </label>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-charcoal-600">
            Already have an account?{' '}
            <Link href={redirectParam ? `/auth/signin?redirect=${encodeURIComponent(redirectParam)}` : '/auth/signin'} className="text-accent-600 hover:text-accent-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-mist-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-charcoal-900 mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
} 