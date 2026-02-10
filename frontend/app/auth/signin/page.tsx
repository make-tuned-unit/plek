'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, Shield, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import toast from 'react-hot-toast'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInForm) => {
    try {
      const result = await login(data.email, data.password)
      if (result.success) {
        toast.success('Successfully signed in!')
        router.push('/profile')
      } else {
        // Show the actual error message from the backend
        toast.error(result.error || 'Invalid email or password')
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error?.message || 'An error occurred during sign in')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-charcoal-900">Welcome back</h1>
          <p className="mt-2 text-charcoal-600">
            Sign in to your plekk account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10 animate-scale-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  className="input pl-10"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
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
                  className="input pl-10 pr-12"
                  placeholder="Enter your password"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-charcoal-700">
                  Remember me
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-accent-600 hover:text-accent-500"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-charcoal-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-charcoal-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleSignInButton />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-charcoal-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-accent-600 hover:text-accent-500 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-xs text-charcoal-500">
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-accent-500" />
            Payments secured by Stripe
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-accent-500" />
            Verified spaces &amp; hosts
          </span>
        </div>
      </div>
    </div>
  )
} 