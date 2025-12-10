'use client'

import { useMemo, useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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
  const hostIntent = searchParams.get('host') === 'true' || searchParams.get('intent') === 'host'
  const checkEmail = searchParams.get('check-email') === 'true'

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
        // Don't redirect - show message about checking email
        router.push('/auth/signup?check-email=true')
      } else {
        toast.error('Failed to create account. Please try again.')
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      // Check if it's a success response but without token (email confirmation required)
      if (error?.response?.data?.success && error?.response?.data?.message?.includes('check your email')) {
        toast.success('Account created! Please check your email to confirm your account.', { duration: 5000 })
        router.push('/auth/signup?check-email=true')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Check your email</h1>
          <p className="text-gray-600 mb-6">
            We've sent a confirmation email to your inbox. Please click the link in the email to confirm your account and activate it.
          </p>
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 text-left list-disc list-inside space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes - emails can take up to 5 minutes to arrive</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-accent-600 hover:text-accent-700 font-semibold text-sm"
            >
              Try signing up again
            </button>
            <Link
              href="/auth/signin"
              className="text-gray-600 hover:text-gray-900 font-semibold text-sm"
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
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">
            {hostIntent
              ? 'Create an account to start listing your driveway.'
              : 'Join plekk and start earning from your driveway'}
          </p>

        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    {...register('firstName')}
                    type="text"
                    id="firstName"
                    className="w-full pl-10 pr-4 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    {...register('lastName')}
                    type="text"
                    id="lastName"
                    className="w-full pl-10 pr-4 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-4 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  {...register('phone')}
                  type="tel"
                  id="phone"
                  className="w-full pl-10 pr-4 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
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
                <label htmlFor="isHost" className="text-gray-700">
                  I want to list my driveway and become a host
                </label>
                <p className="text-gray-500 mt-1">
                  Check this if you want to rent out your driveway to other drivers
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="w-full pl-10 pr-12 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="w-full pl-10 pr-12 py-3 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                <label htmlFor="acceptTerms" className="text-gray-700">
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
              className="w-full bg-accent-500 text-white py-3 px-4 rounded-lg hover:bg-accent-600 focus:ring-2 focus:ring-accent-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </button>
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-accent-600 hover:text-accent-500 font-medium">
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
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
} 