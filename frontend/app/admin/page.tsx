'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import toast from 'react-hot-toast'
import {
  Shield,
  CheckCircle,
  CheckCircle2,
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
  X,
  PlusCircle,
  Upload,
  ArrowLeft,
  ArrowRight,
  Building2,
  AlertTriangle,
  UserCheck,
  Repeat,
  Eye,
  Home,
  BookOpen,
  Star,
  ShieldCheck,
  CreditCard,
  Bell,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
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
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'users' | 'crm' | 'create-listing' | 'commercial'>('pending')
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
    usersByRegion: { region: string; count: number }[];
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
  const [commercialLeads, setCommercialLeads] = useState<any[]>([])
  const [commercialNotes, setCommercialNotes] = useState<Record<string, string>>({})
  const [commercialFollowUp, setCommercialFollowUp] = useState<Record<string, string>>({})

  // CRM state
  const [crmUsers, setCrmUsers] = useState<any[]>([])
  const [crmTotal, setCrmTotal] = useState(0)
  const [crmPage, setCrmPage] = useState(1)
  const [crmSearch, setCrmSearch] = useState('')
  const [crmStageFilter, setCrmStageFilter] = useState('all')
  const [crmSortField, setCrmSortField] = useState('created_at')
  const [crmSortOrder, setCrmSortOrder] = useState<'asc' | 'desc'>('desc')
  const [crmLoading, setCrmLoading] = useState(false)
  // CRM user detail
  const [crmSelectedUserId, setCrmSelectedUserId] = useState<string | null>(null)
  const [crmUserDetail, setCrmUserDetail] = useState<any>(null)
  const [crmDetailLoading, setCrmDetailLoading] = useState(false)
  const [crmTimelineExpanded, setCrmTimelineExpanded] = useState(false)
  // CRM email composer
  const [showCrmEmailComposer, setShowCrmEmailComposer] = useState(false)
  const [crmEmailSubject, setCrmEmailSubject] = useState('')
  const [crmEmailBody, setCrmEmailBody] = useState('')
  const [crmEmailSending, setCrmEmailSending] = useState(false)

  // Create listing state
  const [clSelectedUser, setClSelectedUser] = useState<any>(null)
  const [clUserSearch, setClUserSearch] = useState('')
  const [clUserResults, setClUserResults] = useState<any[]>([])
  const [clUserSearchLoading, setClUserSearchLoading] = useState(false)
  const [clAutoApprove, setClAutoApprove] = useState(false)
  const [clStep, setClStep] = useState(1)
  const [clSubmitting, setClSubmitting] = useState(false)
  const [clSuccess, setClSuccess] = useState<string | null>(null)
  const [clImages, setClImages] = useState<string[]>([])
  const [clImageFiles, setClImageFiles] = useState<File[]>([])
  const [clForm, setClForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: 'NS',
    zipCode: '',
    propertyType: 'driveway' as string,
    hourlyRate: '',
    dailyRate: '',
    maxVehicleSize: 'sedan' as string,
    features: [] as string[],
    availability: {
      monday: true, tuesday: true, wednesday: true, thursday: true,
      friday: true, saturday: true, sunday: true,
    },
    startTime: '00:00',
    endTime: '23:59',
    requireApproval: false,
    leadTimeHours: 24,
  })

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
          usersByRegion: response.data.usersByRegion ?? [],
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
      fetchCommercialLeads()
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

  const fetchCommercialLeads = async () => {
    try {
      const response = await apiService.getAdminCommercialLeads()
      if (response.success && response.data) {
        const leads = response.data.leads || []
        setCommercialLeads(leads)
        setCommercialNotes(Object.fromEntries(leads.map((lead: any) => [lead.id, lead.internalNotes || ''])))
        setCommercialFollowUp(Object.fromEntries(leads.map((lead: any) => [lead.id, lead.followUpState || ''])))
      }
    } catch (error) {
      toast.error('Failed to load commercial submissions')
    }
  }

  // CRM functions
  const fetchCrmUsers = async () => {
    try {
      setCrmLoading(true)
      const res = await apiService.getCrmUsers({
        search: crmSearch || undefined,
        stage: crmStageFilter !== 'all' ? crmStageFilter : undefined,
        sort: crmSortField,
        order: crmSortOrder,
        page: crmPage,
        limit: 50,
      })
      if (res.success && res.data) {
        setCrmUsers(res.data.users)
        setCrmTotal(res.data.total)
      }
    } catch {
      toast.error('Failed to load CRM users')
    } finally {
      setCrmLoading(false)
    }
  }

  const fetchCrmUserDetail = async (userId: string) => {
    try {
      setCrmDetailLoading(true)
      setCrmSelectedUserId(userId)
      setCrmTimelineExpanded(false)
      const res = await apiService.getCrmUserDetail(userId)
      if (res.success && res.data) {
        setCrmUserDetail(res.data)
      } else {
        toast.error('User not found')
        setCrmSelectedUserId(null)
      }
    } catch {
      toast.error('Failed to load user details')
    } finally {
      setCrmDetailLoading(false)
    }
  }

  const handleCrmSort = (field: string) => {
    if (crmSortField === field) {
      setCrmSortOrder(crmSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setCrmSortField(field)
      setCrmSortOrder('desc')
    }
    setCrmPage(1)
  }

  const handleSendCrmEmail = async () => {
    if (!crmSelectedUserId || !crmEmailSubject.trim() || !crmEmailBody.trim()) {
      toast.error('Subject and body are required')
      return
    }
    try {
      setCrmEmailSending(true)
      const res = await apiService.sendCrmEmail(crmSelectedUserId, crmEmailSubject.trim(), crmEmailBody.trim())
      if (res.success) {
        toast.success('Email sent!')
        setShowCrmEmailComposer(false)
        setCrmEmailSubject('')
        setCrmEmailBody('')
      } else {
        throw new Error(res.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send email')
    } finally {
      setCrmEmailSending(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'crm' && user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchCrmUsers()
    }
  }, [activeTab, crmPage, crmSortField, crmSortOrder, crmStageFilter])

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

  const updateCommercialLead = async (leadId: string, status?: string) => {
    try {
      setProcessingId(leadId)
      const response = await apiService.updateAdminCommercialLead(leadId, {
        status,
        internalNotes: commercialNotes[leadId] || '',
        followUpState: commercialFollowUp[leadId] || '',
      })
      if (!response.success) {
        throw new Error(response.error || 'Failed to update commercial submission')
      }
      toast.success('Commercial submission updated')
      await fetchCommercialLeads()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update commercial submission')
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
            <>
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
              {stats.usersByRegion && stats.usersByRegion.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-mist-200 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-charcoal-800 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent-600" />
                    By province / state
                  </h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {stats.usersByRegion.map(({ region, count }) => (
                      <span key={region} className="text-charcoal-700">
                        <span className="font-medium text-charcoal-900">{region}</span>
                        <span className="text-charcoal-500 ml-1">({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
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
            <button
              onClick={() => setActiveTab('crm')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'crm'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              CRM
            </button>
            <button
              onClick={() => setActiveTab('create-listing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create-listing'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <PlusCircle className="h-4 w-4 inline mr-2" />
              Create Listing
            </button>
            <button
              onClick={() => setActiveTab('commercial')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'commercial'
                  ? 'border-accent-400 text-accent-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-600 hover:border-mist-300'
              }`}
            >
              <Building2 className="h-4 w-4 inline mr-2" />
              Commercial ({commercialLeads.length})
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

        {/* Create Listing Tab */}
        {activeTab === 'create-listing' && (
          <div className="space-y-6">
            {clSuccess ? (
              <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-charcoal-900 mb-2">Listing Created</h3>
                <p className="text-charcoal-600 mb-6">{clSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setClSuccess(null)
                    setClSelectedUser(null)
                    setClStep(1)
                    setClImages([])
                    setClImageFiles([])
                    setClAutoApprove(false)
                    setClForm({
                      title: '', description: '', address: '', city: '', state: 'NS', zipCode: '',
                      propertyType: 'driveway', hourlyRate: '', dailyRate: '', maxVehicleSize: 'sedan',
                      features: [], availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
                      startTime: '00:00', endTime: '23:59', requireApproval: false, leadTimeHours: 24,
                    })
                  }}
                  className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
                >
                  Create Another
                </button>
              </div>
            ) : !clSelectedUser ? (
              /* Step 1: Select User */
              <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent-600" />
                  Select a user to create listing for
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                  <input
                    type="text"
                    value={clUserSearch}
                    onChange={(e) => setClUserSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setClUserSearchLoading(true)
                        apiService.searchUsers(clUserSearch).then((res) => {
                          setClUserResults(res.success && res.data ? res.data.users || [] : [])
                        }).catch(() => setClUserResults([])).finally(() => setClUserSearchLoading(false))
                      }
                    }}
                    placeholder="Search by email, first name, or last name..."
                    className="flex-1 min-w-0 rounded-lg border border-mist-300 px-3 py-2 text-base focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setClUserSearchLoading(true)
                      apiService.searchUsers(clUserSearch).then((res) => {
                        setClUserResults(res.success && res.data ? res.data.users || [] : [])
                      }).catch(() => setClUserResults([])).finally(() => setClUserSearchLoading(false))
                    }}
                    disabled={clUserSearchLoading}
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {clUserSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </div>
                {clUserResults.length === 0 && !clUserSearchLoading && (
                  <p className="text-charcoal-500 text-sm">
                    {clUserSearch ? 'No users found.' : 'Enter a search term and click Search.'}
                  </p>
                )}
                {clUserResults.length > 0 && (
                  <ul className="space-y-2">
                    {clUserResults.map((u: any) => (
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
                            {u.is_host && <span className="text-xs text-accent-600 font-medium">Host</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClSelectedUser(u)}
                          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm"
                        >
                          Select
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              /* Step 2: Listing Form */
              <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-charcoal-900">Create Listing</h2>
                    <p className="text-sm text-charcoal-500">
                      For: <span className="font-medium text-charcoal-700">{clSelectedUser.first_name} {clSelectedUser.last_name}</span> ({clSelectedUser.email})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClSelectedUser(null)}
                    className="text-sm text-accent-600 hover:text-accent-700 font-medium"
                  >
                    Change User
                  </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-2 sm:gap-4 mb-6">
                  {[
                    { id: 1, title: 'Basic Info' },
                    { id: 2, title: 'Pricing' },
                    { id: 3, title: 'Photos' },
                    { id: 4, title: 'Review' },
                  ].map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setClStep(step.id)}
                      className="flex-1 min-w-0 flex flex-col items-center gap-1 focus:outline-none"
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${
                        clStep >= step.id
                          ? 'bg-accent-500 border-accent-500 text-white'
                          : 'border-mist-300 text-mist-600'
                      }`}>
                        {clStep > step.id ? <CheckCircle className="h-5 w-5" /> : <span className="text-sm font-medium">{step.id}</span>}
                      </div>
                      <span className={`hidden sm:block text-xs font-medium ${clStep >= step.id ? 'text-charcoal-900' : 'text-mist-600'}`}>{step.title}</span>
                    </button>
                  ))}
                </div>

                {/* Step 1: Basic Info */}
                {clStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">Listing Title</label>
                      <input type="text" value={clForm.title} onChange={(e) => setClForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                        placeholder="e.g., Downtown Parking Spot" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">Description</label>
                      <textarea rows={3} value={clForm.description} onChange={(e) => setClForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                        placeholder="Describe the parking space..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Street Address</label>
                        <input type="text" value={clForm.address} onChange={(e) => setClForm(f => ({ ...f, address: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="1234 Barrington St" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">City</label>
                        <input type="text" value={clForm.city} onChange={(e) => setClForm(f => ({ ...f, city: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="Halifax" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Province</label>
                        <select value={clForm.state} onChange={(e) => setClForm(f => ({ ...f, state: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent">
                          {[
                            { value: 'NS', label: 'Nova Scotia' }, { value: 'AB', label: 'Alberta' },
                            { value: 'BC', label: 'British Columbia' }, { value: 'MB', label: 'Manitoba' },
                            { value: 'NB', label: 'New Brunswick' }, { value: 'NL', label: 'Newfoundland and Labrador' },
                            { value: 'NT', label: 'Northwest Territories' }, { value: 'NU', label: 'Nunavut' },
                            { value: 'ON', label: 'Ontario' }, { value: 'PE', label: 'Prince Edward Island' },
                            { value: 'QC', label: 'Quebec' }, { value: 'SK', label: 'Saskatchewan' },
                            { value: 'YT', label: 'Yukon' },
                          ].map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Postal Code</label>
                        <input type="text" value={clForm.zipCode} onChange={(e) => setClForm(f => ({ ...f, zipCode: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="B3J 1Y2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Property Type</label>
                        <select value={clForm.propertyType} onChange={(e) => setClForm(f => ({ ...f, propertyType: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent">
                          <option value="driveway">Driveway</option>
                          <option value="garage">Garage</option>
                          <option value="warehouse">Warehouse</option>
                          <option value="barn">Barn</option>
                          <option value="storage">Storage</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Max Vehicle Size</label>
                        <select value={clForm.maxVehicleSize} onChange={(e) => setClForm(f => ({ ...f, maxVehicleSize: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent">
                          <option value="compact">Compact</option>
                          <option value="sedan">Sedan</option>
                          <option value="suv">SUV</option>
                          <option value="truck">Truck</option>
                          <option value="any">Any Size</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-2">Features</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: 'covered', label: 'Covered Parking' }, { id: 'security', label: 'Security Camera' },
                          { id: 'lighting', label: 'Well Lit' }, { id: 'access', label: '24/7 Access' },
                          { id: 'ev', label: 'EV Charging' }, { id: 'wifi', label: 'Free WiFi' },
                          { id: 'guard', label: 'Security Guard' }, { id: 'easy', label: 'Easy Access' },
                        ].map((feat) => (
                          <button key={feat.id} type="button"
                            onClick={() => setClForm(f => ({
                              ...f,
                              features: f.features.includes(feat.id)
                                ? f.features.filter(x => x !== feat.id)
                                : [...f.features, feat.id]
                            }))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                              clForm.features.includes(feat.id)
                                ? 'border-accent-400 bg-accent-50 text-accent-700'
                                : 'border-mist-300 bg-white text-charcoal-700 hover:border-mist-400'
                            }`}>
                            {feat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Pricing */}
                {clStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Hourly Rate ($)</label>
                        <input type="number" min="1" step="0.50" value={clForm.hourlyRate}
                          onChange={(e) => setClForm(f => ({ ...f, hourlyRate: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="15.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Daily Rate ($)</label>
                        <input type="number" min="1" step="0.50" value={clForm.dailyRate}
                          onChange={(e) => setClForm(f => ({ ...f, dailyRate: e.target.value }))}
                          className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                          placeholder="50.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Days</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(clForm.availability).map(([day, checked]) => (
                          <label key={day} className="flex items-center">
                            <input type="checkbox" checked={checked}
                              onChange={(e) => setClForm(f => ({
                                ...f,
                                availability: { ...f.availability, [day]: e.target.checked }
                              }))}
                              className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded" />
                            <span className="ml-2 text-sm text-charcoal-700 capitalize">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Times</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-charcoal-600 mb-1">Start Time</label>
                          <input type="time" value={clForm.startTime}
                            onChange={(e) => setClForm(f => ({ ...f, startTime: e.target.value }))}
                            className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs text-charcoal-600 mb-1">End Time</label>
                          <input type="time" value={clForm.endTime}
                            onChange={(e) => setClForm(f => ({ ...f, endTime: e.target.value }))}
                            className="w-full px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">Booking Lead Time</label>
                      <select value={clForm.leadTimeHours}
                        onChange={(e) => setClForm(f => ({ ...f, leadTimeHours: Number(e.target.value) }))}
                        className="px-3 py-2 text-base border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent">
                        <option value={0}>Same day</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours</option>
                        <option value={168}>1 week</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={clForm.requireApproval}
                        onChange={(e) => setClForm(f => ({ ...f, requireApproval: e.target.checked }))}
                        className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded" />
                      <span className="text-sm text-charcoal-700">Always require approval</span>
                    </label>
                  </div>
                )}

                {/* Step 3: Photos */}
                {clStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-charcoal-700">Upload photos of the space</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          <button type="button"
                            onClick={() => {
                              URL.revokeObjectURL(clImages[idx])
                              setClImages(prev => prev.filter((_, i) => i !== idx))
                              setClImageFiles(prev => prev.filter((_, i) => i !== idx))
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <label className="border-2 border-dashed border-mist-300 rounded-lg p-6 text-center hover:border-mist-400 cursor-pointer">
                        <input type="file" multiple accept="image/*" className="hidden"
                          onChange={(e) => {
                            const files = e.target.files
                            if (files) {
                              const fileList = Array.from(files)
                              setClImages(prev => [...prev, ...fileList.map(f => URL.createObjectURL(f))])
                              setClImageFiles(prev => [...prev, ...fileList])
                            }
                            e.target.value = ''
                          }} />
                        <Upload className="h-8 w-8 text-mist-500 mx-auto mb-2" />
                        <p className="text-sm text-charcoal-600">Upload Photos</p>
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {clStep === 4 && (
                  <div className="space-y-4">
                    <div className="bg-mist-100 rounded-lg p-4">
                      <h3 className="font-medium text-charcoal-900 mb-3">Listing Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-charcoal-600">Host:</span><span className="font-medium">{clSelectedUser.first_name} {clSelectedUser.last_name} ({clSelectedUser.email})</span></div>
                        <div className="flex justify-between"><span className="text-charcoal-600">Title:</span><span className="font-medium">{clForm.title}</span></div>
                        <div className="flex justify-between"><span className="text-charcoal-600">Type:</span><span className="font-medium capitalize">{clForm.propertyType}</span></div>
                        <div className="flex justify-between"><span className="text-charcoal-600">Location:</span><span className="font-medium">{clForm.address}, {clForm.city}, {clForm.state} {clForm.zipCode}</span></div>
                        <div className="flex justify-between"><span className="text-charcoal-600">Hourly Rate:</span><span className="font-medium">${clForm.hourlyRate}/hr</span></div>
                        {clForm.dailyRate && <div className="flex justify-between"><span className="text-charcoal-600">Daily Rate:</span><span className="font-medium">${clForm.dailyRate}/day</span></div>}
                        <div className="flex justify-between"><span className="text-charcoal-600">Features:</span><span className="font-medium">{clForm.features.join(', ') || 'None'}</span></div>
                        <div className="flex justify-between"><span className="text-charcoal-600">Photos:</span><span className="font-medium">{clImages.length} uploaded</span></div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 p-3 bg-accent-50 rounded-lg">
                      <input type="checkbox" checked={clAutoApprove}
                        onChange={(e) => setClAutoApprove(e.target.checked)}
                        className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-mist-300 rounded" />
                      <span className="text-sm text-charcoal-700 font-medium">Auto-approve (skip pending review)</span>
                    </label>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t">
                  <button type="button"
                    onClick={() => clStep > 1 ? setClStep(clStep - 1) : setClSelectedUser(null)}
                    className="flex items-center px-4 py-2 text-charcoal-600 border border-mist-300 rounded-lg hover:bg-mist-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {clStep === 1 ? 'Back' : 'Previous'}
                  </button>
                  {clStep < 4 ? (
                    <button type="button" onClick={() => setClStep(clStep + 1)}
                      className="flex items-center px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600">
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  ) : (
                    <button type="button" disabled={clSubmitting}
                      onClick={async () => {
                        if (!clForm.title || !clForm.description || !clForm.address || !clForm.hourlyRate) {
                          toast.error('Please fill in all required fields (title, description, address, hourly rate)')
                          return
                        }
                        if (clForm.features.length === 0) {
                          toast.error('Please select at least one feature')
                          return
                        }
                        setClSubmitting(true)
                        try {
                          // Geocode
                          let coordinates: [number, number] | undefined
                          const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
                          if (mapboxToken) {
                            try {
                              const parts = [clForm.address, clForm.city, clForm.state, clForm.zipCode].filter(Boolean)
                              const geoRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(parts.join(', '))}.json?access_token=${mapboxToken}&limit=1&types=address,place`)
                              const geo = await geoRes.json()
                              if (geo?.features?.length && geo.features[0].center?.length >= 2) {
                                coordinates = geo.features[0].center as [number, number]
                              }
                            } catch (_) { /* continue */ }
                          }

                          const payload = {
                            host_id: clSelectedUser.id,
                            auto_approve: clAutoApprove,
                            title: clForm.title,
                            description: clForm.description,
                            address: clForm.address,
                            city: clForm.city,
                            state: clForm.state,
                            zip_code: clForm.zipCode,
                            price: parseFloat(clForm.hourlyRate),
                            property_type: clForm.propertyType,
                            max_vehicles: 1,
                            features: clForm.features,
                            restrictions: [],
                            require_approval: clForm.requireApproval,
                            instant_booking: !clForm.requireApproval,
                            coordinates,
                            start_time: clForm.startTime,
                            end_time: clForm.endTime,
                            monday_available: clForm.availability.monday,
                            tuesday_available: clForm.availability.tuesday,
                            wednesday_available: clForm.availability.wednesday,
                            thursday_available: clForm.availability.thursday,
                            friday_available: clForm.availability.friday,
                            saturday_available: clForm.availability.saturday,
                            sunday_available: clForm.availability.sunday,
                          }

                          const response = await apiService.adminCreateProperty(payload)
                          if (!response.success || !response.data?.property?.id) {
                            throw new Error(response.error || 'Failed to create listing')
                          }

                          const propertyId = response.data.property.id

                          // Upload photos
                          for (const file of clImageFiles) {
                            await apiService.adminUploadPropertyPhoto(propertyId, file)
                          }

                          toast.success('Listing created successfully!')
                          setClSuccess(`Listing "${clForm.title}" created for ${clSelectedUser.first_name} ${clSelectedUser.last_name}${clAutoApprove ? ' (auto-approved)' : ' (pending review)'}`)
                          fetchPendingProperties()
                          fetchAllProperties()
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to create listing')
                        } finally {
                          setClSubmitting(false)
                        }
                      }}
                      className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      {clSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create Listing'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commercial' && (
          <>
            {commercialLeads.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Building2 className="h-16 w-16 text-charcoal-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                  No Commercial Submissions
                </h3>
                <p className="text-charcoal-600">
                  Commercial intake submissions will appear here for manual review.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {commercialLeads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg shadow-sm border border-mist-200 overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900">{lead.companyName}</h3>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-mist-100 text-charcoal-800">
                              {lead.status}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-accent-50 text-accent-700">
                              {lead.approximateSpaceCount || 'n/a'} spaces
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-charcoal-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span>{lead.contactName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span>{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 flex-shrink-0" />
                              <span>{lead.phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span>{lead.city}, {lead.province}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>Submitted {new Date(lead.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 flex-shrink-0" />
                              <span>Stripe: {lead.stripeReadiness || 'n/a'}</span>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg bg-mist-100 p-4">
                              <p className="text-sm font-semibold text-charcoal-900 mb-2">Commercial setup</p>
                              <p className="text-sm text-charcoal-600 mb-2">Property type: {lead.propertyType}</p>
                              <p className="text-sm text-charcoal-600 mb-2">
                                Vehicle types: {(lead.vehicleTypesAllowed || []).join(', ') || 'n/a'}
                              </p>
                              <p className="text-sm text-charcoal-600">
                                Booking types: {(lead.bookingTypesSupported || []).join(', ') || 'n/a'}
                              </p>
                            </div>
                            <div className="rounded-lg bg-mist-100 p-4">
                              <p className="text-sm font-semibold text-charcoal-900 mb-2">Founder ops</p>
                              <p className="text-sm text-charcoal-600 mb-2">
                                Spreadsheet: {lead.hasSpreadsheet ? 'Yes' : 'No'}{lead.spreadsheetLater ? ' (sending later)' : ''}
                              </p>
                              <p className="text-sm text-charcoal-600 mb-2">
                                Upload: {lead.uploadedFileName || 'None attached'}
                              </p>
                              <p className="text-sm text-charcoal-600">Follow-up: {lead.followUpState || 'Not set'}</p>
                            </div>
                          </div>

                          {lead.properties?.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {lead.properties.map((property: any) => (
                                <div key={property.id} className="rounded-lg border border-mist-200 p-4">
                                  <p className="font-semibold text-charcoal-900">{property.name}</p>
                                  <p className="text-sm text-charcoal-600">{property.address}, {property.city}, {property.province}</p>
                                  <p className="mt-2 text-sm text-charcoal-600">
                                    {property.zones?.length || 0} zones, {property.inventoryBuckets?.length || 0} pooled buckets
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {lead.notes && (
                            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-4">
                              <p className="text-sm font-semibold text-charcoal-900 mb-1">Operator notes</p>
                              <p className="text-sm text-charcoal-700 whitespace-pre-wrap">{lead.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="w-full lg:w-[320px] space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">Internal notes</label>
                            <textarea
                              value={commercialNotes[lead.id] || ''}
                              onChange={(e) => setCommercialNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                              rows={5}
                              className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                              placeholder="Manual setup checklist, payout follow-up, questions for operator..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">Follow-up state</label>
                            <input
                              value={commercialFollowUp[lead.id] || ''}
                              onChange={(e) => setCommercialFollowUp((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                              className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                              placeholder="e.g. waiting-on-csv, ready-for-activation"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['reviewing', 'needs-info', 'approved', 'rejected'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateCommercialLead(lead.id, status)}
                                disabled={processingId === lead.id}
                                className="px-3 py-2 rounded-lg bg-charcoal-900 text-white text-sm font-medium disabled:opacity-50"
                              >
                                {status}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateCommercialLead(lead.id)}
                              disabled={processingId === lead.id}
                              className="px-3 py-2 rounded-lg border border-mist-300 text-charcoal-700 text-sm font-medium disabled:opacity-50"
                            >
                              Save notes
                            </button>
                          </div>
                        </div>
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

        {/* CRM Tab */}
        {activeTab === 'crm' && !crmSelectedUserId && (
          <div className="min-w-0">
            {/* Funnel stage pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'all', label: 'All', color: 'bg-charcoal-100 text-charcoal-700' },
                { key: 'signed_up', label: 'Signed Up', color: 'bg-gray-100 text-gray-700', icon: Clock },
                { key: 'verified', label: 'Verified', color: 'bg-blue-100 text-blue-700', icon: UserCheck },
                { key: 'active', label: 'Active', color: 'bg-amber-100 text-amber-700', icon: TrendingUp },
                { key: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
                { key: 'repeat', label: 'Repeat', color: 'bg-purple-100 text-purple-700', icon: Repeat },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setCrmStageFilter(s.key); setCrmPage(1) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    crmStageFilter === s.key
                      ? 'bg-charcoal-800 text-white'
                      : `${s.color} hover:opacity-80`
                  }`}
                >
                  {s.icon && <s.icon className="h-3 w-3" />}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setCrmPage(1); fetchCrmUsers() } }}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-mist-300 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => { setCrmPage(1); fetchCrmUsers() }}
                className="px-5 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm font-medium flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-mist-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-mist-50 border-b border-mist-200">
                      <th className="text-left px-4 py-3 font-medium text-charcoal-600">User</th>
                      <th
                        className="text-left px-4 py-3 font-medium text-charcoal-600 cursor-pointer hover:text-charcoal-900"
                        onClick={() => handleCrmSort('created_at')}
                      >
                        Joined {crmSortField === 'created_at' && (crmSortOrder === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal-600">Stage</th>
                      <th
                        className="text-center px-4 py-3 font-medium text-charcoal-600 cursor-pointer hover:text-charcoal-900"
                        onClick={() => handleCrmSort('total_bookings')}
                      >
                        Bookings {crmSortField === 'total_bookings' && (crmSortOrder === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />)}
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-charcoal-600">Properties</th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal-600">Location</th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal-600">Friction</th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal-600">Last Active</th>
                      <th className="text-center px-4 py-3 font-medium text-charcoal-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crmLoading ? (
                      <tr><td colSpan={9} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent-500" /></td></tr>
                    ) : crmUsers.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-12 text-charcoal-500">No users found</td></tr>
                    ) : (
                      crmUsers.map((u: any) => {
                        const stageMap: Record<string, { label: string; color: string }> = {
                          signed_up: { label: 'Signed Up', color: 'bg-gray-100 text-gray-700' },
                          verified: { label: 'Verified', color: 'bg-blue-100 text-blue-700' },
                          active: { label: 'Active', color: 'bg-amber-100 text-amber-700' },
                          completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
                          repeat: { label: 'Repeat', color: 'bg-purple-100 text-purple-700' },
                        }
                        const frictionMap: Record<string, { label: string; color: string }> = {
                          unverified_24h: { label: 'Unverified 24h+', color: 'bg-red-100 text-red-700' },
                          incomplete_profile: { label: 'Incomplete profile', color: 'bg-orange-100 text-orange-700' },
                          no_phone: { label: 'No phone', color: 'bg-yellow-100 text-yellow-700' },
                          property_rejected: { label: 'Property rejected', color: 'bg-red-100 text-red-700' },
                          only_cancelled_bookings: { label: 'Only cancellations', color: 'bg-red-100 text-red-700' },
                        }
                        const stageCfg = stageMap[u.funnel_stage] || stageMap.signed_up
                        return (
                          <tr key={u.id} className="border-b border-mist-100 hover:bg-mist-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-charcoal-200 flex items-center justify-center text-charcoal-600 font-medium text-sm shrink-0">
                                  {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-charcoal-900 truncate">
                                    {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—'}
                                  </p>
                                  <p className="text-xs text-charcoal-500 truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stageCfg.color}`}>
                                {stageCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium">{u.total_bookings}</span>
                              {u.completed_bookings > 0 && <span className="text-xs text-green-600 ml-1">({u.completed_bookings})</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {u.total_properties > 0 ? <span>{u.active_properties}/{u.total_properties}</span> : <span className="text-charcoal-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">
                              {u.city || u.state ? (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[u.city, u.state].filter(Boolean).join(', ')}</span>
                              ) : <span className="text-charcoal-400">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {u.friction_flags?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {u.friction_flags.slice(0, 2).map((f: string) => {
                                    const cfg = frictionMap[f]
                                    return cfg ? (
                                      <span key={f} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}>
                                        <AlertTriangle className="h-2.5 w-2.5" />{cfg.label}
                                      </span>
                                    ) : null
                                  })}
                                  {u.friction_flags.length > 2 && <span className="text-[10px] text-charcoal-400">+{u.friction_flags.length - 2}</span>}
                                </div>
                              ) : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </td>
                            <td className="px-4 py-3 text-charcoal-600 text-xs whitespace-nowrap">
                              {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => fetchCrmUserDetail(u.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-xs font-medium"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {Math.ceil(crmTotal / 50) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-mist-200 bg-mist-50">
                  <p className="text-xs text-charcoal-500">Page {crmPage} of {Math.ceil(crmTotal / 50)} ({crmTotal} users)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setCrmPage((p) => Math.max(1, p - 1))} disabled={crmPage <= 1} className="px-3 py-1.5 rounded border border-mist-300 text-xs hover:bg-white disabled:opacity-50">
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                    <button onClick={() => setCrmPage((p) => Math.min(Math.ceil(crmTotal / 50), p + 1))} disabled={crmPage >= Math.ceil(crmTotal / 50)} className="px-3 py-1.5 rounded border border-mist-300 text-xs hover:bg-white disabled:opacity-50">
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CRM User Detail View */}
        {activeTab === 'crm' && crmSelectedUserId && (
          <div className="min-w-0">
            {crmDetailLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent-500" /></div>
            ) : crmUserDetail ? (() => {
              const du = crmUserDetail.user
              const ds = crmUserDetail.stats
              const dtl = crmUserDetail.timeline || []
              const dProps = crmUserDetail.properties || []
              const dBookings = crmUserDetail.bookings || []
              const dReviews = crmUserDetail.reviews || []
              const dStage = crmUserDetail.funnel_stage
              const dFriction = crmUserDetail.friction_flags || []
              const stageMap: Record<string, { label: string; color: string }> = {
                signed_up: { label: 'Signed Up', color: 'bg-gray-100 text-gray-700' },
                verified: { label: 'Verified', color: 'bg-blue-100 text-blue-700' },
                active: { label: 'Active', color: 'bg-amber-100 text-amber-700' },
                completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
                repeat: { label: 'Repeat', color: 'bg-purple-100 text-purple-700' },
              }
              const frictionMap: Record<string, { label: string; color: string }> = {
                unverified_24h: { label: 'Unverified 24h+', color: 'bg-red-100 text-red-700' },
                incomplete_profile: { label: 'Incomplete profile', color: 'bg-orange-100 text-orange-700' },
                no_phone: { label: 'No phone', color: 'bg-yellow-100 text-yellow-700' },
                property_rejected: { label: 'Property rejected', color: 'bg-red-100 text-red-700' },
                only_cancelled_bookings: { label: 'Only cancellations', color: 'bg-red-100 text-red-700' },
              }
              const stageCfg = stageMap[dStage] || stageMap.signed_up
              const visibleTimeline = crmTimelineExpanded ? dtl : dtl.slice(0, 10)
              const timelineIcons: Record<string, any> = { signup: Calendar, verified: ShieldCheck, booking: BookOpen, property: Home, review: Star }

              return (
                <>
                  {/* Back button */}
                  <button
                    onClick={() => { setCrmSelectedUserId(null); setCrmUserDetail(null) }}
                    className="flex items-center gap-2 text-sm text-charcoal-600 hover:text-charcoal-900 mb-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to CRM list
                  </button>

                  {/* Profile + Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-mist-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-charcoal-200 flex items-center justify-center text-charcoal-600 font-bold text-xl shrink-0">
                          {(du.first_name?.[0] || du.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-charcoal-900">
                              {du.first_name || du.last_name ? `${du.first_name || ''} ${du.last_name || ''}`.trim() : 'No name'}
                            </h2>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${stageCfg.color}`}>{stageCfg.label}</span>
                            {du.is_host && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700"><Home className="h-3 w-3" />Host{du.host_type ? ` (${du.host_type})` : ''}</span>}
                            {du.is_verified ? <span title="Verified"><CheckCircle2 className="h-4 w-4 text-green-500" /></span> : <span title="Unverified"><AlertTriangle className="h-4 w-4 text-amber-500" /></span>}
                          </div>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm text-charcoal-600">
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{du.email}</span>
                            {du.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{du.phone}</span>}
                            {(du.city || du.state) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[du.address, du.city, du.state, du.zip_code].filter(Boolean).join(', ')}</span>}
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {new Date(du.created_at).toLocaleDateString()}</span>
                          </div>
                          {du.bio && <p className="mt-3 text-sm text-charcoal-500 italic">&quot;{du.bio}&quot;</p>}
                          {dFriction.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {dFriction.map((f: string) => { const cfg = frictionMap[f]; return cfg ? <span key={f} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}><AlertTriangle className="h-3 w-3" />{cfg.label}</span> : null })}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 mt-4 text-xs text-charcoal-500">
                            <span className="flex items-center gap-1"><Bell className="h-3 w-3" />Email notifs: {du.email_notifications_bookings !== false ? 'On' : 'Off'}</span>
                            <span>Marketing: {du.marketing_emails !== false ? 'On' : 'Off'}</span>
                            {du.stripe_customer_id && <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Stripe connected</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6 flex flex-col gap-3">
                      <h3 className="font-semibold text-charcoal-900 mb-1">Actions</h3>
                      <button
                        onClick={() => { setMessageUserId(crmSelectedUserId) }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm font-medium"
                      >
                        <MessageCircle className="h-4 w-4" />Send Message
                      </button>
                      <button
                        onClick={() => setShowCrmEmailComposer(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-900 text-sm font-medium"
                      >
                        <Mail className="h-4 w-4" />Send Email
                      </button>
                      <div className="border-t border-mist-200 pt-3 mt-1">
                        <p className="text-xs text-charcoal-500">Role: <span className="font-medium text-charcoal-700">{du.role}</span></p>
                        <p className="text-xs text-charcoal-500 mt-1">ID: <span className="font-mono text-[10px]">{du.id}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                    {[
                      { label: 'Total Bookings', value: ds.total_bookings, sub: `${ds.completed_bookings} completed` },
                      { label: 'As Renter', value: ds.bookings_as_renter },
                      { label: 'As Host', value: ds.bookings_as_host },
                      { label: 'Properties', value: ds.total_properties, sub: `${ds.active_properties} active` },
                      { label: 'Earnings', value: `$${(ds.total_earnings || 0).toFixed(2)}` },
                      { label: 'Rating', value: ds.rating ? `${ds.rating.toFixed(1)}/5` : '—', sub: ds.review_count ? `${ds.review_count} reviews` : undefined },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-lg shadow-sm border border-mist-200 p-4">
                        <p className="text-xs text-charcoal-500">{s.label}</p>
                        <p className="text-xl font-bold text-charcoal-900 mt-1">{s.value}</p>
                        {s.sub && <p className="text-xs text-charcoal-400 mt-0.5">{s.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Timeline + Sidebar */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-mist-200 p-6">
                      <h3 className="font-semibold text-charcoal-900 mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-accent-500" />Activity Timeline</h3>
                      {dtl.length === 0 ? <p className="text-sm text-charcoal-500">No activity recorded</p> : (
                        <div className="space-y-0">
                          {visibleTimeline.map((event: any, i: number) => {
                            const Icon = timelineIcons[event.type] || Clock
                            return (
                              <div key={i} className="flex gap-3 pb-4 relative">
                                {i < visibleTimeline.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-mist-200" />}
                                <div className="w-8 h-8 rounded-full bg-mist-100 flex items-center justify-center shrink-0 relative z-10"><Icon className="h-4 w-4 text-charcoal-600" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-charcoal-900">{event.detail}</p>
                                  <p className="text-xs text-charcoal-400 mt-0.5">{new Date(event.date).toLocaleString()}</p>
                                  {event.meta?.amount && <p className="text-xs text-charcoal-500 mt-0.5">${event.meta.amount.toFixed(2)}</p>}
                                  {event.meta?.comment && <p className="text-xs text-charcoal-500 mt-1 italic">&quot;{event.meta.comment}&quot;</p>}
                                </div>
                              </div>
                            )
                          })}
                          {dtl.length > 10 && (
                            <button onClick={() => setCrmTimelineExpanded(!crmTimelineExpanded)} className="text-sm text-accent-600 hover:text-accent-700 flex items-center gap-1 mt-2">
                              {crmTimelineExpanded ? <>Show less <ChevronUp className="h-3 w-3" /></> : <>Show all {dtl.length} events <ChevronDown className="h-3 w-3" /></>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-6">
                      {/* Properties */}
                      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
                        <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2"><Home className="h-4 w-4 text-accent-500" />Properties ({dProps.length})</h3>
                        {dProps.length === 0 ? <p className="text-sm text-charcoal-500">No properties</p> : (
                          <ul className="space-y-2">
                            {dProps.slice(0, 5).map((p: any) => (
                              <li key={p.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                                <p className="font-medium text-charcoal-900 truncate">{p.title}</p>
                                <div className="flex items-center gap-2 text-xs text-charcoal-500">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{p.status}</span>
                                  <span>${p.hourly_rate}/hr</span>
                                  {p.city && <span>{p.city}</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* Bookings */}
                      <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
                        <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent-500" />Recent Bookings ({dBookings.length})</h3>
                        {dBookings.length === 0 ? <p className="text-sm text-charcoal-500">No bookings</p> : (
                          <ul className="space-y-2">
                            {dBookings.slice(0, 5).map((b: any) => (
                              <li key={b.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                                <div className="flex items-center justify-between">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span>
                                  <span className="text-xs text-charcoal-500">${(b.total_amount || 0).toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-charcoal-500 mt-1">{b.renter_id === crmSelectedUserId ? 'As renter' : 'As host'} — {new Date(b.created_at).toLocaleDateString()}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* Reviews */}
                      {dReviews.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
                          <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-accent-500" />Reviews ({dReviews.length})</h3>
                          <ul className="space-y-2">
                            {dReviews.slice(0, 5).map((r: any) => (
                              <li key={r.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />)}</div>
                                  <span className="text-xs text-charcoal-400">{r.reviewer_id === crmSelectedUserId ? 'Left' : 'Received'}</span>
                                </div>
                                {r.comment && <p className="text-xs text-charcoal-500 mt-1 italic">&quot;{r.comment}&quot;</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })() : null}
          </div>
        )}
      </div>

      {/* CRM Email Composer Modal */}
      {showCrmEmailComposer && crmUserDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-mist-200">
              <h3 className="font-semibold text-charcoal-900"><Mail className="h-4 w-4 inline mr-2" />Send Plekk Email to {crmUserDetail.user.first_name || crmUserDetail.user.email}</h3>
              <button onClick={() => setShowCrmEmailComposer(false)} className="p-2 rounded-lg hover:bg-mist-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">To</label>
                <input type="text" value={crmUserDetail.user.email} disabled className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm bg-mist-50 text-charcoal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Subject</label>
                <input type="text" value={crmEmailSubject} onChange={(e) => setCrmEmailSubject(e.target.value)} placeholder="Email subject..." className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Body</label>
                <textarea value={crmEmailBody} onChange={(e) => setCrmEmailBody(e.target.value)} rows={8} placeholder="Write your message..." className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none" />
                <p className="text-xs text-charcoal-400 mt-1">Sent as a branded plekk email with header, footer, and logo.</p>
              </div>
            </div>
            <div className="p-4 border-t border-mist-200 flex gap-3">
              <button onClick={() => setShowCrmEmailComposer(false)} className="flex-1 px-4 py-2 text-charcoal-700 border border-mist-300 rounded-lg hover:bg-mist-100">Cancel</button>
              <button onClick={handleSendCrmEmail} disabled={!crmEmailSubject.trim() || !crmEmailBody.trim() || crmEmailSending} className="flex-1 px-4 py-2 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-900 disabled:opacity-50 flex items-center justify-center gap-2">
                {crmEmailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send Email
              </button>
            </div>
          </div>
        </div>
      )}

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
