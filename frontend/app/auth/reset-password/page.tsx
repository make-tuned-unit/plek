'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type') || 'recovery'
  const email = searchParams.get('email') || ''

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!tokenHash || !token) {
      toast.error('Invalid or expired reset link. Please request a new one.')
      return
    }
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await apiService.resetPassword({
        token_hash: tokenHash,
        token,
        type,
        email: email || undefined,
        newPassword: data.newPassword,
      })
      if (result.success) {
        setSuccess(true)
        toast.success('Password reset successfully. You can now sign in.')
        setTimeout(() => router.push('/auth/signin'), 2000)
      } else {
        toast.error(result.message || 'Failed to reset password. Please try again.')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!tokenHash || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10">
            <h1 className="text-2xl font-bold text-charcoal-900">Invalid or expired link</h1>
            <p className="mt-2 text-charcoal-600">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-6 inline-block btn-primary py-3 px-6"
            >
              Request new reset link
            </Link>
            <p className="mt-6 text-center text-sm text-charcoal-600">
              <Link href="/auth/signin" className="text-accent-600 hover:text-accent-500 font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10 text-center">
            <h1 className="text-2xl font-bold text-charcoal-900">Password reset</h1>
            <p className="mt-2 text-charcoal-600">
              Your password has been updated. Redirecting you to sign in...
            </p>
            <Link
              href="/auth/signin"
              className="mt-6 inline-block btn-primary py-3 px-6"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-charcoal-900">Set new password</h1>
          <p className="mt-2 text-charcoal-600">
            Enter your new password below
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-mist-200 p-8 md:p-10 animate-scale-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-charcoal-700 mb-2">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 h-5 w-5" />
                <input
                  {...register('newPassword')}
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  className="input pl-10 pr-12"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
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
                  placeholder="Confirm your new password"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-charcoal-600">
            <Link href="/auth/signin" className="text-accent-600 hover:text-accent-500 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100 flex items-center justify-center">
        <p className="text-charcoal-600">Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
