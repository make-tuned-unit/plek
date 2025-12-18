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
  List,
  TrendingUp,
  Filter,
  FileText,
  Eye,
  Check,
  X
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
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'verifications'>('pending')
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([])
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false)
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [stats, setStats] = useState<{
    bookings: number;
    users: number;
    listings: number;
    totalBookingValue: number;
    totalServiceFeeRevenue: number;
  } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

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
      fetchAdminStats()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchAdminStats()
      if (activeTab === 'verifications') {
        fetchPendingVerifications()
      }
    }
  }, [startDate, endDate, user, activeTab])

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

  const fetchAdminStats = async () => {
    try {
      setIsLoadingStats(true)
      const params: { startDate?: string; endDate?: string } = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await apiService.getAdminStats(params)
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching admin stats:', error)
      toast.error('Failed to load statistics')
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchPendingVerifications = async () => {
    try {
      setIsLoadingVerifications(true)
      const response = await apiService.getPendingVerifications({ type: 'identity' })
      if (response.success && response.data) {
        setPendingVerifications(response.data.verifications || [])
      }
    } catch (error: any) {
      console.error('Error fetching pending verifications:', error)
      toast.error('Failed to load verifications')
    } finally {
      setIsLoadingVerifications(false)
    }
  }

  const handleViewVerification = async (id: string) => {
    try {
      const response = await apiService.getVerificationDetails(id)
      if (response.success && response.data) {
        setSelectedVerification(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching verification details:', error)
      toast.error('Failed to load verification details')
    }
  }

  const handleApproveVerification = async (id: string) => {
    try {
      setProcessingId(id)
      const response = await apiService.approveVerification(id, approveNotes || undefined)
      if (response.success) {
        toast.success('Verification approved!')
        setSelectedVerification(null)
        setApproveNotes('')
        fetchPendingVerifications()
      } else {
        throw new Error(response.error || 'Failed to approve')
      }
    } catch (error: any) {
      console.error('Error approving verification:', error)
      toast.error(error.message || 'Failed to approve verification')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectVerification = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      setProcessingId(id)
      const response = await apiService.rejectVerification(id, rejectReason, rejectNotes || undefined)
      if (response.success) {
        toast.success('Verification rejected')
        setSelectedVerification(null)
        setRejectReason('')
        setRejectNotes('')
        fetchPendingVerifications()
      } else {
        throw new Error(response.error || 'Failed to reject')
      }
    } catch (error: any) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value)
    } else {
      setEndDate(value)
    }
  }

  const clearDateRange = () => {
    setStartDate('')
    setEndDate('')
  }

  const setQuickDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
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
        {/* KPI Cards */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent-600" />
                Key Performance Indicators
              </h2>
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="End Date"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={clearDateRange}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => setQuickDateRange(7)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setQuickDateRange(30)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    30d
                  </button>
                  <button
                    onClick={() => setQuickDateRange(90)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    90d
                  </button>
                </div>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
                <span className="ml-3 text-gray-600">Loading statistics...</span>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Bookings */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.bookings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                </div>

                {/* Total Users */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.users.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>

                {/* Total Listings */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <MapPin className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stats.listings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Listings</div>
                </div>

                {/* Total Booking Value */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ${stats.totalBookingValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-600">Total Booking Value</div>
                </div>

                {/* Total Service Fee Revenue */}
                <div className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg p-6 border border-accent-200">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-8 w-8 text-accent-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ${stats.totalServiceFeeRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-600">Service Fee Revenue</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No statistics available
              </div>
            )}
          </div>
        </div>

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
            <button
              onClick={() => {
                setActiveTab('verifications')
                fetchPendingVerifications()
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verifications'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Verifications ({pendingVerifications.length})
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

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <>
            {isLoadingVerifications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
                <span className="ml-3 text-gray-600">Loading verifications...</span>
              </div>
            ) : pendingVerifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Pending Verifications
                </h3>
                <p className="text-gray-600">
                  All identity verifications have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingVerifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Identity Verification
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                              Pending Review
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Submitted {new Date(verification.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewVerification(verification.id)}
                          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Review
                        </button>
                      </div>

                      {verification.user && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">User Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Name:</span>
                              <span className="ml-2 font-medium text-gray-900">{verification.user.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-2 font-medium text-gray-900">{verification.user.email}</span>
                            </div>
                            {verification.user.phone && (
                              <div>
                                <span className="text-gray-600">Phone:</span>
                                <span className="ml-2 font-medium text-gray-900">{verification.user.phone}</span>
                              </div>
                            )}
                            {verification.user.address && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Address:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {[
                                    verification.user.address.street,
                                    verification.user.address.city,
                                    verification.user.address.state,
                                    verification.user.address.zipCode,
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {verification.documents && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">ID Documents</h4>
                          <div className="flex gap-4">
                            {verification.documents.frontImage && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Front</p>
                                <img
                                  src={verification.documents.frontImage}
                                  alt="Front of ID"
                                  className="w-48 h-32 object-contain border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(verification.documents.frontImage, '_blank')}
                                />
                              </div>
                            )}
                            {verification.documents.backImage && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Back</p>
                                <img
                                  src={verification.documents.backImage}
                                  alt="Back of ID"
                                  className="w-48 h-32 object-contain border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(verification.documents.backImage, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Verification Detail Modal */}
            {selectedVerification && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Review Identity Verification</h2>
                      <button
                        onClick={() => {
                          setSelectedVerification(null)
                          setRejectReason('')
                          setRejectNotes('')
                          setApproveNotes('')
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* User Details for Comparison */}
                    {selectedVerification.user && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">User Profile Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-2 font-medium text-gray-900">{selectedVerification.user.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2 font-medium text-gray-900">{selectedVerification.user.email}</span>
                          </div>
                          {selectedVerification.user.phone && (
                            <div>
                              <span className="text-gray-600">Phone:</span>
                              <span className="ml-2 font-medium text-gray-900">{selectedVerification.user.phone}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Member Since:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {new Date(selectedVerification.user.memberSince).toLocaleDateString()}
                            </span>
                          </div>
                          {selectedVerification.user.address && (
                            <div className="md:col-span-2">
                              <span className="text-gray-600">Address:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {[
                                  selectedVerification.user.address.street,
                                  selectedVerification.user.address.city,
                                  selectedVerification.user.address.state,
                                  selectedVerification.user.address.zipCode,
                                  selectedVerification.user.address.country,
                                ].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ID Documents */}
                    {selectedVerification.documents && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">ID Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedVerification.documents.frontImage && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Front of ID</p>
                              <img
                                src={selectedVerification.documents.frontImage}
                                alt="Front of ID"
                                className="w-full h-auto border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:opacity-80"
                                onClick={() => window.open(selectedVerification.documents.frontImage, '_blank')}
                              />
                            </div>
                          )}
                          {selectedVerification.documents.backImage && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Back of ID</p>
                              <img
                                src={selectedVerification.documents.backImage}
                                alt="Back of ID"
                                className="w-full h-auto border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:opacity-80"
                                onClick={() => window.open(selectedVerification.documents.backImage, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                        {selectedVerification.documents.documentType && (
                          <p className="text-sm text-gray-600 mt-2">
                            Document Type: <span className="font-medium">{selectedVerification.documents.documentType}</span>
                          </p>
                        )}
                        {selectedVerification.documents.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            Notes: {selectedVerification.documents.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t border-gray-200 pt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Approval Notes (Optional)
                        </label>
                        <textarea
                          value={approveNotes}
                          onChange={(e) => setApproveNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="Add any notes about this verification..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason (Required if rejecting)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          placeholder="Explain why this verification is being rejected..."
                        />
                        <textarea
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          rows={2}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          placeholder="Additional notes (optional)..."
                        />
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => handleApproveVerification(selectedVerification.id)}
                          disabled={processingId === selectedVerification.id}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          {processingId === selectedVerification.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectVerification(selectedVerification.id)}
                          disabled={processingId === selectedVerification.id || !rejectReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          {processingId === selectedVerification.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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


