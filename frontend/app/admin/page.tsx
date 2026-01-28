'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  DollarSign,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Trash2,
  List
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [pendingProperties, setPendingProperties] = useState<any[]>([])
  const [allProperties, setAllProperties] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({})
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    if (!authLoading) {
      // Check if user is admin
      if (!user) {
        router.push('/auth/signin')
        return
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        toast.error('Admin access required')
        router.push('/profile')
        return
      }
      
      fetchPendingProperties()
      fetchAllProperties()
    }
  }, [user, authLoading, router])

  const fetchPendingProperties = async () => {
    try {
      const response = await apiService.getPendingProperties()
      if (response.success && response.data) {
        setPendingProperties(response.data.properties || [])
      }
    } catch (error: any) {
      console.error('Error fetching pending properties:', error)
      toast.error('Failed to load pending properties')
    }
  }

  const fetchAllProperties = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getProperties()
      if (response.success && response.data) {
        // Filter out deleted properties
        const activeProperties = (response.data.properties || []).filter(
          (p: any) => p.status !== 'deleted'
        )
        setAllProperties(activeProperties)
      }
    } catch (error: any) {
      console.error('Error fetching all properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (propertyId: string) => {
    try {
      setProcessingId(propertyId)
      const response = await apiService.approveProperty(propertyId)
      if (response.success) {
        toast.success('Property approved successfully!')
        // Remove from pending list and refresh all properties
        setPendingProperties(prev => prev.filter(p => p.id !== propertyId))
        await fetchAllProperties() // Refresh to show updated status
      } else {
        throw new Error(response.error || 'Failed to approve property')
      }
    } catch (error: any) {
      console.error('Error approving property:', error)
      toast.error(error.message || 'Failed to approve property')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (propertyId: string) => {
    try {
      setProcessingId(propertyId)
      const reason = rejectReason[propertyId] || ''
      const response = await apiService.rejectProperty(propertyId, reason)
      if (response.success) {
        toast.success('Property rejected')
        // Remove from pending list
        setPendingProperties(prev => prev.filter(p => p.id !== propertyId))
        setAllProperties(prev => prev.filter(p => p.id !== propertyId))
        setShowRejectModal(null)
        setRejectReason(prev => ({ ...prev, [propertyId]: '' }))
      } else {
        throw new Error(response.error || 'Failed to reject property')
      }
    } catch (error: any) {
      console.error('Error rejecting property:', error)
      toast.error(error.message || 'Failed to reject property')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (propertyId: string) => {
    try {
      setProcessingId(propertyId)
      const response = await apiService.adminDeleteProperty(propertyId)
      if (response.success) {
        toast.success('Property deleted successfully')
        // Remove from both lists
        setPendingProperties(prev => prev.filter(p => p.id !== propertyId))
        setAllProperties(prev => prev.filter(p => p.id !== propertyId))
        setShowDeleteModal(null)
      } else {
        throw new Error(response.error || 'Failed to delete property')
      }
    } catch (error: any) {
      console.error('Error deleting property:', error)
      toast.error(error.message || 'Failed to delete property')
    } finally {
      setProcessingId(null)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary-700" />
                Admin Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Review and approve property listings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-sm font-medium">
                {pendingProperties.length} Pending
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {allProperties.length} Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Pending Review ({pendingProperties.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              All Properties ({allProperties.length})
            </button>
          </nav>
        </div>

        {/* Pending Properties Tab */}
        {activeTab === 'pending' && (
          <>
            {pendingProperties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Pending Properties
            </h3>
            <p className="text-gray-600">
              All properties have been reviewed. Check back later for new submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {property.title}
                        </h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Pending Review
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{property.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">
                            {property.address}, {property.city}, {property.state} {property.zip_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">
                            ${property.hourly_rate}/hour
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            Submitted {new Date(property.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="text-sm">
                            {property.host?.first_name} {property.host?.last_name}
                          </span>
                        </div>
                      </div>

                      {/* Host Contact Info */}
                      {property.host && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Host Information</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{property.host.email}</span>
                            </div>
                            {property.host.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{property.host.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Photos */}
                      {property.photos && property.photos.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Photos</h4>
                          <div className="flex gap-2 flex-wrap">
                            {property.photos.map((photo: any, index: number) => (
                              <img
                                key={index}
                                src={photo.url}
                                alt={`${property.title} - Photo ${index + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(property.id)}
                      disabled={processingId === property.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingId === property.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(property.id)}
                      disabled={processingId === property.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* All Properties Tab */}
        {activeTab === 'all' && (
          <>
            {allProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <List className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Properties Found
                </h3>
                <p className="text-gray-600">
                  There are no active properties in the system.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {allProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {property.title}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              property.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : property.status === 'pending_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {property.status === 'active' ? 'Active' : 
                               property.status === 'pending_review' ? 'Pending' : 
                               property.status}
                            </span>
                          </div>

                          <p className="text-gray-600 mb-4">{property.description}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">
                                {property.address}, {property.city}, {property.state} {property.zip_code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span className="text-sm">
                                ${property.hourly_rate}/hour
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                Created {new Date(property.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <span className="text-sm">
                                {property.host?.first_name} {property.host?.last_name}
                              </span>
                            </div>
                          </div>

                          {/* Host Contact Info */}
                          {property.host && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Host Information</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{property.host.email}</span>
                                </div>
                                {property.host.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{property.host.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Photos */}
                          {property.photos && property.photos.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Photos</h4>
                              <div className="flex gap-2 flex-wrap">
                                {property.photos.map((photo: any, index: number) => (
                                  <img
                                    key={index}
                                    src={photo.url}
                                    alt={`${property.title} - Photo ${index + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setShowDeleteModal(property.id)}
                          disabled={processingId === property.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processingId === property.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete Listing
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Property</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this property (optional):
            </p>
            <textarea
              value={rejectReason[showRejectModal] || ''}
              onChange={(e) => setRejectReason(prev => ({ ...prev, [showRejectModal]: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectReason(prev => ({ ...prev, [showRejectModal]: '' }))
                }}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === showRejectModal ? 'Rejecting...' : 'Reject Property'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Property</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={processingId === showDeleteModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === showDeleteModal ? 'Deleting...' : 'Delete Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


