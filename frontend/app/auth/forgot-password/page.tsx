'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await apiService.forgotPassword(data.email)
      if (result.success) {
        setSubmitted(true)
        toast.success('If an account exists, we sent a reset link to your email.')
      } else {
        toast.error(result.message || 'Something went wrong. Please try again.')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
          <p className="mt-2 text-gray-600">
            Enter your email and we&apos;ll send you a link to reset your password
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10 animate-scale-in">
          {submitted ? (
            <div className="space-y-6">
              <p className="text-gray-700">
                If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox (and spam folder).
              </p>
              <p className="text-sm text-gray-600">
                The link expires in 1 hour.
              </p>
              <Link
                href="/auth/signin"
                className="block w-full text-center btn-primary py-3"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    className="input pl-10"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/auth/signin" className="text-accent-600 hover:text-accent-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
