'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { apiService } from '../../../../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  MessageCircle,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Home,
  BookOpen,
  UserCheck,
  TrendingUp,
  Repeat,
  ShieldCheck,
  Eye,
  CreditCard,
  Bell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  signed_up: { label: 'Signed Up', color: 'bg-gray-100 text-gray-700', icon: Clock },
  verified: { label: 'Verified', color: 'bg-blue-100 text-blue-700', icon: UserCheck },
  active: { label: 'Active', color: 'bg-amber-100 text-amber-700', icon: TrendingUp },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  repeat: { label: 'Repeat', color: 'bg-purple-100 text-purple-700', icon: Repeat },
}

const FRICTION_CONFIG: Record<string, { label: string; color: string }> = {
  unverified_24h: { label: 'Unverified 24h+', color: 'bg-red-100 text-red-700' },
  incomplete_profile: { label: 'Incomplete profile', color: 'bg-orange-100 text-orange-700' },
  no_phone: { label: 'No phone', color: 'bg-yellow-100 text-yellow-700' },
  property_rejected: { label: 'Property rejected', color: 'bg-red-100 text-red-700' },
  only_cancelled_bookings: { label: 'Only cancellations', color: 'bg-red-100 text-red-700' },
}

const TIMELINE_ICONS: Record<string, any> = {
  signup: Calendar,
  verified: ShieldCheck,
  booking: BookOpen,
  property: Home,
  review: Star,
}

export default function CrmUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user: authUser, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Messenger state
  const [showMessenger, setShowMessenger] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Email composer state
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Timeline expansion
  const [timelineExpanded, setTimelineExpanded] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
        router.push('/admin')
        return
      }
      fetchUser()
    }
  }, [authUser, authLoading, id])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const res = await apiService.getCrmUserDetail(id)
      if (res.success && res.data) {
        setData(res.data)
      } else {
        toast.error('User not found')
        router.push('/admin/crm')
      }
    } catch {
      toast.error('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const openMessenger = async () => {
    setShowMessenger(true)
    setMessagesLoading(true)
    try {
      const res = await apiService.getDirectMessages(id)
      if (res.success && res.data) {
        setMessages(res.data?.messages || [])
      }
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      setSendingMessage(true)
      const res = await apiService.sendDirectMessage(id, newMessage.trim())
      const msg = res.success ? res.data?.message : null
      if (msg) {
        setMessages((prev) => [...prev, msg])
        setNewMessage('')
      } else {
        throw new Error(res.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Subject and body are required')
      return
    }
    try {
      setSendingEmail(true)
      const res = await apiService.sendCrmEmail(id, emailSubject.trim(), emailBody.trim())
      if (res.success) {
        toast.success('Email sent!')
        setShowEmailComposer(false)
        setEmailSubject('')
        setEmailBody('')
      } else {
        throw new Error(res.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    )
  }

  if (!data) return null

  const { user: u, stats, funnel_stage, friction_flags, timeline, bookings, properties, reviews } = data
  const stageCfg = STAGE_CONFIG[funnel_stage] || STAGE_CONFIG.signed_up
  const StageIcon = stageCfg.icon
  const visibleTimeline = timelineExpanded ? timeline : timeline.slice(0, 10)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-mist-100 text-charcoal-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-charcoal-900">User Profile</h1>
      </div>

      {/* Profile Card + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-mist-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-charcoal-200 flex items-center justify-center text-charcoal-600 font-bold text-xl shrink-0">
              {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-charcoal-900">
                  {u.first_name || u.last_name
                    ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                    : 'No name'}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${stageCfg.color}`}>
                  <StageIcon className="h-3 w-3" />
                  {stageCfg.label}
                </span>
                {u.is_host && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                    <Home className="h-3 w-3" />
                    Host{u.host_type ? ` (${u.host_type})` : ''}
                  </span>
                )}
                {u.is_verified ? (
                  <span title="Verified"><CheckCircle2 className="h-4 w-4 text-green-500" /></span>
                ) : (
                  <span title="Unverified"><AlertTriangle className="h-4 w-4 text-amber-500" /></span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-charcoal-600">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {u.email}
                </span>
                {u.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {u.phone}
                  </span>
                )}
                {(u.city || u.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {[u.address, u.city, u.state, u.zip_code].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>

              {u.bio && (
                <p className="mt-3 text-sm text-charcoal-500 italic">&quot;{u.bio}&quot;</p>
              )}

              {/* Friction flags */}
              {friction_flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {friction_flags.map((f: string) => {
                    const cfg = FRICTION_CONFIG[f]
                    return cfg ? (
                      <span
                        key={f}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {/* Preferences */}
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-charcoal-500">
                <span className="flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  Email notifs: {u.email_notifications_bookings !== false ? 'On' : 'Off'}
                </span>
                <span>Marketing: {u.marketing_emails !== false ? 'On' : 'Off'}</span>
                {u.stripe_customer_id && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Stripe connected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6 flex flex-col gap-3">
          <h3 className="font-semibold text-charcoal-900 mb-1">Actions</h3>
          <button
            onClick={openMessenger}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            Send Message
          </button>
          <button
            onClick={() => setShowEmailComposer(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-900 text-sm font-medium"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </button>
          <div className="border-t border-mist-200 pt-3 mt-1">
            <p className="text-xs text-charcoal-500">Role: <span className="font-medium text-charcoal-700">{u.role}</span></p>
            <p className="text-xs text-charcoal-500 mt-1">ID: <span className="font-mono text-[10px]">{u.id}</span></p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Bookings', value: stats.total_bookings, sub: `${stats.completed_bookings} completed` },
          { label: 'As Renter', value: stats.bookings_as_renter },
          { label: 'As Host', value: stats.bookings_as_host },
          { label: 'Properties', value: stats.total_properties, sub: `${stats.active_properties} active` },
          { label: 'Earnings', value: `$${(stats.total_earnings || 0).toFixed(2)}` },
          { label: 'Rating', value: stats.rating ? `${stats.rating.toFixed(1)}/5` : '—', sub: stats.review_count ? `${stats.review_count} reviews` : undefined },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow-sm border border-mist-200 p-4">
            <p className="text-xs text-charcoal-500">{s.label}</p>
            <p className="text-xl font-bold text-charcoal-900 mt-1">{s.value}</p>
            {s.sub && <p className="text-xs text-charcoal-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Timeline + Side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-mist-200 p-6">
          <h3 className="font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent-500" />
            Activity Timeline
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-charcoal-500">No activity recorded</p>
          ) : (
            <div className="space-y-0">
              {visibleTimeline.map((event: any, i: number) => {
                const Icon = TIMELINE_ICONS[event.type] || Clock
                return (
                  <div key={i} className="flex gap-3 pb-4 relative">
                    {/* Vertical line */}
                    {i < visibleTimeline.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-mist-200" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-mist-100 flex items-center justify-center shrink-0 relative z-10">
                      <Icon className="h-4 w-4 text-charcoal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal-900">{event.detail}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        {new Date(event.date).toLocaleString()}
                      </p>
                      {event.meta?.amount && (
                        <p className="text-xs text-charcoal-500 mt-0.5">${event.meta.amount.toFixed(2)}</p>
                      )}
                      {event.meta?.comment && (
                        <p className="text-xs text-charcoal-500 mt-1 italic">&quot;{event.meta.comment}&quot;</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {timeline.length > 10 && (
                <button
                  onClick={() => setTimelineExpanded(!timelineExpanded)}
                  className="text-sm text-accent-600 hover:text-accent-700 flex items-center gap-1 mt-2"
                >
                  {timelineExpanded ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show all {timeline.length} events <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Properties + Bookings sidebar */}
        <div className="space-y-6">
          {/* Properties */}
          <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
            <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
              <Home className="h-4 w-4 text-accent-500" />
              Properties ({properties.length})
            </h3>
            {properties.length === 0 ? (
              <p className="text-sm text-charcoal-500">No properties</p>
            ) : (
              <ul className="space-y-2">
                {properties.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                    <p className="font-medium text-charcoal-900 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 text-xs text-charcoal-500">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' :
                        p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{p.status}</span>
                      <span>${p.hourly_rate}/hr</span>
                      {p.city && <span>{p.city}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
            <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent-500" />
              Recent Bookings ({bookings.length})
            </h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-charcoal-500">No bookings</p>
            ) : (
              <ul className="space-y-2">
                {bookings.slice(0, 5).map((b: any) => (
                  <li key={b.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        b.status === 'completed' ? 'bg-green-100 text-green-700' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{b.status}</span>
                      <span className="text-xs text-charcoal-500">${(b.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      {b.renter_id === id ? 'As renter' : 'As host'} — {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-mist-200 p-6">
              <h3 className="font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-accent-500" />
                Reviews ({reviews.length})
              </h3>
              <ul className="space-y-2">
                {reviews.slice(0, 5).map((r: any) => (
                  <li key={r.id} className="text-sm border-b border-mist-100 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-charcoal-400">
                        {r.reviewer_id === id ? 'Left' : 'Received'}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-charcoal-500 mt-1 italic">&quot;{r.comment}&quot;</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Messenger Modal */}
      {showMessenger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-mist-200">
              <h3 className="font-semibold text-charcoal-900">
                Message {u.first_name || u.email}
              </h3>
              <button onClick={() => setShowMessenger(false)} className="p-2 rounded-lg hover:bg-mist-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-charcoal-500 text-sm text-center py-4">No messages yet.</p>
              ) : (
                messages.map((msg: any) => {
                  const isAdmin = msg.sender_id === authUser?.id
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isAdmin ? 'bg-accent-500 text-white' : 'bg-mist-100 text-charcoal-900'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isAdmin ? 'text-accent-100' : 'text-charcoal-500'}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-4 border-t border-mist-200 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-mist-200">
              <h3 className="font-semibold text-charcoal-900">
                <Mail className="h-4 w-4 inline mr-2" />
                Send Plekk Email to {u.first_name || u.email}
              </h3>
              <button onClick={() => setShowEmailComposer(false)} className="p-2 rounded-lg hover:bg-mist-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">To</label>
                <input
                  type="text"
                  value={u.email}
                  disabled
                  className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm bg-mist-50 text-charcoal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  className="w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-charcoal-400 mt-1">
                  Sent as a branded plekk email with header, footer, and logo.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-mist-200 flex gap-3">
              <button
                onClick={() => setShowEmailComposer(false)}
                className="flex-1 px-4 py-2 text-charcoal-700 border border-mist-300 rounded-lg hover:bg-mist-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailSubject.trim() || !emailBody.trim() || sendingEmail}
                className="flex-1 px-4 py-2 bg-charcoal-800 text-white rounded-lg hover:bg-charcoal-900 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
