'use client'

import { CheckCircle } from 'lucide-react'

interface VerificationBadgeProps {
  verified: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function VerificationBadge({ 
  verified, 
  size = 'md',
  showText = true,
  className = '' 
}: VerificationBadgeProps) {
  if (!verified) return null

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <CheckCircle className={`${sizeClasses[size]} text-green-600 fill-current`} />
      {showText && (
        <span className={`${textSizes[size]} font-medium text-green-700`}>
          Verified
        </span>
      )}
    </div>
  )
}

