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
  BarChart3,
  TrendingUp,
  Receipt,
  Search,
  MessageCircle,
  Send,
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
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'users'>('pending')
  // User search (admin)
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [messageUserId, setMessageUserId] = useState<string | null>(null)
  const [directMessages, setDirectMessages] = useState<any[]>([])
  const [directOtherUser, setDirectOtherUser] = useState<any>(null)
  const [directMessagesLoading, setDirectMessagesLoading] = useState(false)
  const [newMessageText, setNewMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  // KPIs / metrics
  const [stats, setStats] = useState<{
    bookings: number;
    users: number;
    listings: number;
    totalRevenue: number;
    totalFees: number;
    dateRange: { start: string | null; end: string | null };
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | 'all'>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  })
  const [datePreset, setDatePreset] = useState<string>('last30')
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'paid'>('all')
  const [taxConfig, setTaxConfig] = useState<{
    tax_mode: string;
    tax_effective_at: string | null;
    revenue_cad: number;
    threshold_cad: number;
    revenue_last_synced_at: string | null;
  } | null>(null)

  const fetchAdminStats = async () => {
    try {
      setStatsLoading(true)
      const params: { startDate?: string; endDate?: string; bookingStatus?: 'all' | 'paid' } = {}
      if (dateRange !== 'all' && typeof dateRange === 'object') {
        params.startDate = dateRange.start
        params.endDate = dateRange.end
      }
      if (bookingStatusFilter) params.bookingStatus = bookingStatusFilter
      const response = await apiService.getAdminStats(params)
      if (response.success && response.data) {
        setStats({
          bookings: response.data.bookings,
          users: response.data.users,
          listings: response.data.listings,
          totalRevenue: response.data.totalRevenue ?? response.data.totalBookingValue ?? 0,
          totalFees: response.data.totalFees ?? response.data.totalServiceFeeRevenue ?? 0,
          dateRange: response.data.dateRange || { start: null, end: null },
        })
      }
    } catch (e) {
      toast.error('Failed to load metrics')
    } finally {
      setStatsLoading(false)
    }
  }

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
      apiService.getAdminTaxConfig().then((r) => {
        if (r.success && r.data) setTaxConfig(r.data as any)
      }).catch(() => {})
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin') && !authLoading) {
      fetchAdminStats()
    }
  }, [dateRange, bookingStatusFilter])

  const fetchPendingProperties = async () => {
    try {
      const response = await apiService.getPendingProperties()
      if (response.success && response.data) {
        setPendingProperties(response.data.properties || [])
      }
    } catch (error: any) {
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
      toast.error('Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }

  const runUserSearch = async () => {
    try {
      setUserSearchLoading(true)
      const response = await apiService.searchUsers(userSearch)
      if (response.success && response.data) {
        setUserSearchResults(response.data.users || [])
      } else {
        setUserSearchResults([])
      }
    } catch (e) {
      toast.error('Failed to search users')
      setUserSearchResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }

  useEffect(() => {
    if (messageUserId) {
      setDirectMessagesLoading(true)
      apiService.getDirectMessages(messageUserId).then((res) => {
        if (res.success && res.data) {
          setDirectMessages(res.data.messages || [])
          setDirectOtherUser(res.data.otherUser || null)
        }
      }).finally(() => setDirectMessagesLoading(false))
    } else {
      setDirectMessages([])
      setDirectOtherUser(null)
    }
  }, [messageUserId])

  const sendDirectMessage = async () => {
    if (!messageUserId || !newMessageText.trim()) return
    try {
      setSendingMessage(true)
      const res = await apiService.sendDirectMessage(messageUserId, newMessageText.trim())
      const message = res.success && res.data?.message ? res.data.message : null
      if (message) {
        setDirectMessages((prev) => [...prev, message])
        setNewMessageText('')
      } else {
        throw new Error(res.error || 'Failed to send')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send message')
    } finally {
      setSendingMessage(false)
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
      toast.error(error.message || 'Failed to delete property')
    } finally {
      setProcessingId(null)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-mist-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent-500 mx-auto" />
          <p className="mt-4 text-charcoal-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist-100 min-w-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 flex items-center gap-2 sm:gap-3 truncate">
                <Shield className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-primary-700" />
                <span className="truncate">Admin Dashboard</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-charcoal-600 text-sm sm:text-base">
                Review and approve property listings
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-sm font-medium">
                {pendingProperties.length} Pending
              </span>
              <span className="px-3 py-1 bg-mist-100 text-charcoal-800 rounded-full text-sm font-medium">
                {allProperties.length} Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0 w-full overflow-x-hidden">
        {/* KPIs & Filters */}
        <section className="mb-8 min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <h2 className="text-lg font-semibold text-charcoal-900 flex items-center gap-2 flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-accent-600" />
              Metrics
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-sm font-medium text-charcoal-700 flex-shrink-0">Date range</span>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {[
                  { key: 'last7', label: 'Last 7 days', getValue: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 7); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; } },
                  { key: 'last30', label: 'Last 30 days', getValue: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 30); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; } },
                  { key: 'thisMonth', label: 'This month', getValue: () => { const e = new Date(); const s = new Date(e.getFullYear(), e.getMonth(), 1); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; } },
                  { key: 'all', label: 'All time', getValue: () => 'all' as const },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setDatePreset(preset.key)
                      setDateRange(preset.getValue() as any)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      datePreset === preset.key ? 'bg-accent-500 text-white' : 'bg-mist-100 text-charcoal-700 hover:bg-mist-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {dateRange !== 'all' && typeof dateRange === 'object' && (
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => { setDatePreset('custom'); setDateRange((prev) => (prev === 'all' ? prev : { ...prev, start: e.target.value })); }}
                    className="rounded border border-mist-300 px-2 py-1.5 text-sm min-w-[8.5rem]"
                  />
                  <span className="text-charcoal-500 flex-shrink-0">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => { setDatePreset('custom'); setDateRange((prev) => (prev === 'all' ? prev : { ...prev, end: e.target.value })); }}
                    className="rounded border border-mist-300 px-2 py-1.5 text-sm min-w-[8.5rem]"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-mist-200 pt-2 sm:pt-0 sm:pl-3 flex-shrink-0">
                <span className="text-sm font-medium text-charcoal-700 whitespace-nowrap">Bookings</span>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value as 'all' | 'paid')}
                  className="rounded border border-mist-300 px-2.5 py-1.5 text-sm min-w-[11rem] w-auto"
                >
                  <option value="all">All (non-cancelled)</option>
                  <option value="paid">Paid only</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => fetchAdminStats()}
                disabled={statsLoading}
                className="p-2 rounded-lg bg-mist-100 hover:bg-mist-200 disabled:opacity-50 flex-shrink-0"
                title="Refresh metrics"
                aria-label="Refresh metrics"
              >
                <Loader2 className={`h-4 w-4 text-charcoal-600 ${statsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {statsLoading && !stats ? (
            <div className="bg-white rounded-xl border border-mist-200 p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 min-w-0">
              <div className="bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  Bookings
                </div>
                <p className="text-2xl font-bold text-charcoal-900">{stats.bookings.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Total Revenue
                </div>
                <p className="text-2xl font-bold text-charcoal-900">${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-1">
                  <Receipt className="h-4 w-4" />
                  Total Fees
                </div>
                <p className="text-2xl font-bold text-charcoal-900">${stats.totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-1">
                  <User className="h-4 w-4" />
                  Total Users
                </div>
                <p className="text-2xl font-bold text-charcoal-900">{stats.users.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-charcoal-500 text-sm mb-1">
                  <List className="h-4 w-4" />
                  Total Listings
                </div>
                <p className="text-2xl font-bold text-charcoal-900">{stats.listings.toLocaleString()}</p>
              </div>
            </div>
          )}
          {stats && dateRange !== 'all' && typeof dateRange === 'object' && (
            <p className="text-xs text-charcoal-500 mt-2">
              Showing data from {dateRange.start} to {dateRange.end}
            </p>
          )}

          {taxConfig && (
            <div className="mt-6 p-4 bg-mist-50 rounded-xl border border-mist-200">
              <h3 className="text-sm font-semibold text-charcoal-800 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent-600" />
                GST/HST (small-supplier threshold)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-charcoal-500">Tracked revenue (CAD)</span>
                  <p className="font-semibold text-charcoal-900">${taxConfig.revenue_cad.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">Threshold</span>
                  <p className="font-semibold text-charcoal-900">${taxConfig.threshold_cad.toLocaleString('en-CA')}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">Tax mode</span>
                  <p className="font-semibold text-charcoal-900">{taxConfig.tax_mode === 'on' ? 'On (HST charged)' : 'Off (no tax)'}</p>
                </div>
                <div>
                  <span className="text-charcoal-500">Effective date</span>
                  <p className="font-semibold text-charcoal-900">{taxConfig.tax_effective_at ? new Date(taxConfig.tax_effective_at).toLocaleString() : '—'}</p>
                </div>
              </div>
              {taxConfig.revenue_last_synced_at && (
                <p className="text-xs text-charcoal-500 mt-2">Revenue last synced: {new Date(taxConfig.revenue_last_synced_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </section>

        {/* Tabs */}
        <div className="mb-6 border-b border-mist-200 min-w-0 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto overflow-y-hidden">
          <nav className="flex gap-4 sm:space-x-8 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
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
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              All Properties ({allProperties.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Users
            </button>
          </nav>
        </div>

        {/* Pending Properties Tab */}
        {activeTab === 'pending' && (
          <>
            {pendingProperties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
              No Pending Properties
            </h3>
            <p className="text-charcoal-600">
              All properties have been reviewed. Check back later for new submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-6 min-w-0">
            {pendingProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow-sm border border-mist-200 overflow-hidden min-w-0"
              >
                <div className="p-4 sm:p-6 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900 break-words min-w-0">
                          {property.title}
                        </h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Pending Review
                        </span>
                      </div>

                      <p className="text-charcoal-600 mb-4">{property.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 min-w-0">
                        <div className="flex items-start gap-2 text-charcoal-600 min-w-0">
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="text-sm break-words min-w-0">
                            {property.address}, {property.city}, {property.state} {property.zip_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-charcoal-600">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">
                            ${property.hourly_rate}/hour
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-charcoal-600">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">
                            Submitted {new Date(property.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-charcoal-600">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm break-words min-w-0">
                            {property.host?.first_name} {property.host?.last_name}
                          </span>
                        </div>
                      </div>

                      {/* Host Contact Info */}
                      {property.host && (
                        <div className="bg-mist-100 rounded-lg p-4 mb-4 min-w-0">
                          <h4 className="text-sm font-semibold text-charcoal-900 mb-2">Host Information</h4>
                          <div className="space-y-1 text-sm text-charcoal-600">
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
                          <h4 className="text-sm font-semibold text-charcoal-900 mb-2">Photos</h4>
                          <div className="flex gap-2 flex-wrap">
                            {property.photos.map((photo: any, index: number) => (
                              <img
                                key={index}
                                src={photo.url}
                                alt={`${property.title} - Photo ${index + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-mist-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-mist-200">
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
                <List className="h-16 w-16 text-charcoal-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                  No Properties Found
                </h3>
                <p className="text-charcoal-600">
                  There are no active properties in the system.
                </p>
              </div>
            ) : (
              <div className="space-y-6 min-w-0">
                {allProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-lg shadow-sm border border-mist-200 overflow-hidden min-w-0"
                  >
                    <div className="p-4 sm:p-6 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900 break-words min-w-0">
                              {property.title}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              property.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : property.status === 'pending_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-mist-100 text-charcoal-800'
                            }`}>
                              {property.status === 'active' ? 'Active' : 
                               property.status === 'pending_review' ? 'Pending' : 
                               property.status}
                            </span>
                          </div>

                          <p className="text-charcoal-600 mb-4">{property.description}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 min-w-0">
                            <div className="flex items-start gap-2 text-charcoal-600 min-w-0">
                              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span className="text-sm break-words min-w-0">
                                {property.address}, {property.city}, {property.state} {property.zip_code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-charcoal-600">
                              <DollarSign className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">
                                ${property.hourly_rate}/hour
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-charcoal-600">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">
                                Created {new Date(property.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-charcoal-600">
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm break-words min-w-0">
                                {property.host?.first_name} {property.host?.last_name}
                              </span>
                            </div>
                          </div>

                          {/* Host Contact Info */}
                          {property.host && (
                            <div className="bg-mist-100 rounded-lg p-4 mb-4 min-w-0">
                              <h4 className="text-sm font-semibold text-charcoal-900 mb-2">Host Information</h4>
                              <div className="space-y-1 text-sm text-charcoal-600">
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
                              <h4 className="text-sm font-semibold text-charcoal-900 mb-2">Photos</h4>
                              <div className="flex gap-2 flex-wrap">
                                {property.photos.map((photo: any, index: number) => (
                                  <img
                                    key={index}
                                    src={photo.url}
                                    alt={`${property.title} - Photo ${index + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg border border-mist-200"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-mist-200">
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-4 sm:p-6 min-w-0">
            <h2 className="text-lg font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-accent-600" />
              Search users
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-6 min-w-0">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runUserSearch()}
                placeholder="Search by email, first name, or last name..."
                className="flex-1 min-w-0 rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={runUserSearch}
                disabled={userSearchLoading}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
              >
                {userSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>
            {userSearchResults.length === 0 && !userSearchLoading && (
              <p className="text-charcoal-500 text-sm">
                {userSearch ? 'No users found. Try a different search.' : 'Enter a search term and click Search.'}
              </p>
            )}
            {userSearchResults.length > 0 && (
              <ul className="space-y-2">
                {userSearchResults.map((u: any) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-mist-200 hover:bg-mist-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-charcoal-200 flex items-center justify-center text-charcoal-600 font-medium">
                        {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-charcoal-900">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-sm text-charcoal-500">{u.email}</p>
                        {u.phone && <p className="text-xs text-charcoal-400">{u.phone}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMessageUserId(u.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Direct message modal */}
      {messageUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col min-w-0">
            <div className="flex items-center justify-between p-4 border-b border-mist-200">
              <h3 className="font-semibold text-charcoal-900">
                {directOtherUser
                  ? `${directOtherUser.first_name || ''} ${directOtherUser.last_name || ''}`.trim() || directOtherUser.email
                  : 'Loading...'}
              </h3>
              <button
                type="button"
                onClick={() => { setMessageUserId(null); setNewMessageText(''); }}
                className="p-2 rounded-lg hover:bg-mist-100 text-charcoal-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {directMessagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
                </div>
              ) : directMessages.length === 0 ? (
                <p className="text-charcoal-500 text-sm text-center py-4">No messages yet. Send a message below.</p>
              ) : (
                directMessages.map((msg: any) => {
                  const isAdmin = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          isAdmin ? 'bg-accent-500 text-white' : 'bg-mist-100 text-charcoal-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isAdmin ? 'text-accent-100' : 'text-charcoal-500'}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-mist-200 flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendDirectMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={sendDirectMessage}
                disabled={!newMessageText.trim() || sendingMessage}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md min-w-0">
            <h3 className="text-lg font-semibold text-charcoal-900 mb-4">Reject Property</h3>
            <p className="text-sm text-charcoal-600 mb-4">
              Please provide a reason for rejecting this property (optional):
            </p>
            <textarea
              value={rejectReason[showRejectModal] || ''}
              onChange={(e) => setRejectReason(prev => ({ ...prev, [showRejectModal]: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectReason(prev => ({ ...prev, [showRejectModal]: '' }))
                }}
                className="flex-1 px-4 py-2 text-charcoal-700 border border-mist-300 rounded-lg hover:bg-mist-100"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md min-w-0">
            <h3 className="text-lg font-semibold text-charcoal-900 mb-4">Delete Property</h3>
            <p className="text-sm text-charcoal-600 mb-4">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 text-charcoal-700 border border-mist-300 rounded-lg hover:bg-mist-100"
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


