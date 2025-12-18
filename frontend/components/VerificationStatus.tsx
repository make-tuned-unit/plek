'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { apiService } from '@/services/api'
import { VerificationBadge } from './VerificationBadge'

interface VerificationStatusProps {
  userId?: string
  propertyId?: string
  showDetails?: boolean
}

export function VerificationStatus({ 
  userId, 
  propertyId,
  showDetails = true 
}: VerificationStatusProps) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId || propertyId) {
      fetchStatus()
    }
  }, [userId, propertyId])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await apiService.getVerificationStatus()
      if (response.success && response.data) {
        setStatus(response.data)
      }
    } catch (error) {
      console.error('Error fetching verification status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  if (!status) return null

  // Show property verification if propertyId provided
  if (propertyId && status.properties) {
    const property = status.properties.find((p: any) => p.id === propertyId)
    if (!property) return null

    return (
      <div className="space-y-2">
        {property.badgeEarned && (
          <VerificationBadge verified={true} />
        )}
        {showDetails && (
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              {property.photosVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
              <span>Photos {property.photosVerified ? 'Verified' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              {property.locationVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
              <span>Location {property.locationVerified ? 'Verified' : 'Pending'}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show host verification
  return (
    <div className="space-y-3">
      {status.host.badgeEarned && (
        <VerificationBadge verified={true} size="lg" />
      )}
      
      {showDetails && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {status.host.emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={status.host.emailVerified ? 'text-gray-700' : 'text-gray-500'}>
              Email {status.host.emailVerified ? 'Verified' : 'Not Verified'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status.host.identityVerified ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : status.host.verificationStatus === 'pending' ? (
              <Clock className="h-4 w-4 text-yellow-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={
              status.host.identityVerified 
                ? 'text-gray-700' 
                : status.host.verificationStatus === 'pending'
                ? 'text-yellow-600'
                : 'text-gray-500'
            }>
              Identity {status.host.identityVerified ? 'Verified' : status.host.verificationStatus === 'pending' ? 'Pending Review' : 'Not Verified'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status.host.stripePayoutVerified ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={status.host.stripePayoutVerified ? 'text-gray-700' : 'text-gray-500'}>
              Payout Account {status.host.stripePayoutVerified ? 'Set Up' : 'Not Set Up'}
            </span>
          </div>

          {status.host.verificationStatus === 'expired' && (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>Verification expired. Please re-verify.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

