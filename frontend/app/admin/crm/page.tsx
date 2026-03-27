'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { apiService } from '../../../services/api'
import toast from 'react-hot-toast'
import {
  Shield,
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Filter,
  Mail,
  MessageCircle,
  MapPin,
  TrendingUp,
  UserCheck,
  UserX,
  Home,
  Repeat,
  Eye,
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

export default function CrmPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiService.getCrmUsers({
        search: search || undefined,
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        sort: sortField,
        order: sortOrder,
        page,
        limit: pageSize,
      })
      if (res.success && res.data) {
        setUsers(res.data.users)
        setTotal(res.data.total)
      }
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, stageFilter, sortField, sortOrder, page, pageSize])

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        router.push('/admin')
        return
      }
      fetchUsers()
    }
  }, [user, authLoading, fetchUsers, router])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  // Compute stage counts from current users array (visible page only — good enough for filter context)
  const stageCounts = users.reduce((acc: Record<string, number>, u) => {
    acc[u.funnel_stage] = (acc[u.funnel_stage] || 0) + 1
    return acc
  }, {})

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg hover:bg-mist-100 text-charcoal-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-accent-500" />
              CRM
            </h1>
            <p className="text-sm text-charcoal-500">{total} users total</p>
          </div>
        </div>
      </div>

      {/* Funnel stage pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setStageFilter('all'); setPage(1) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            stageFilter === 'all'
              ? 'bg-charcoal-800 text-white'
              : 'bg-mist-100 text-charcoal-600 hover:bg-mist-200'
          }`}
        >
          All
        </button>
        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button
              key={key}
              onClick={() => { setStageFilter(key); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                stageFilter === key
                  ? 'bg-charcoal-800 text-white'
                  : `${cfg.color} hover:opacity-80`
              }`}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
              {stageCounts[key] ? ` (${stageCounts[key]})` : ''}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setPage(1); fetchUsers() }
            }}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-mist-300 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => { setPage(1); fetchUsers() }}
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
                  onClick={() => handleSort('created_at')}
                >
                  Joined <SortIcon field="created_at" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal-600">Stage</th>
                <th
                  className="text-center px-4 py-3 font-medium text-charcoal-600 cursor-pointer hover:text-charcoal-900"
                  onClick={() => handleSort('total_bookings')}
                >
                  Bookings <SortIcon field="total_bookings" />
                </th>
                <th className="text-center px-4 py-3 font-medium text-charcoal-600">Properties</th>
                <th className="text-center px-4 py-3 font-medium text-charcoal-600">Messages</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal-600">Friction</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal-600">Last Active</th>
                <th className="text-center px-4 py-3 font-medium text-charcoal-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-charcoal-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const stageCfg = STAGE_CONFIG[u.funnel_stage] || STAGE_CONFIG.signed_up
                  const StageIcon = stageCfg.icon
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-mist-100 hover:bg-mist-50 transition-colors"
                    >
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-charcoal-200 flex items-center justify-center text-charcoal-600 font-medium text-sm shrink-0">
                            {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-charcoal-900 truncate">
                              {u.first_name || u.last_name
                                ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                : '—'}
                            </p>
                            <p className="text-xs text-charcoal-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      {/* Stage */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stageCfg.color}`}>
                          <StageIcon className="h-3 w-3" />
                          {stageCfg.label}
                        </span>
                      </td>
                      {/* Bookings */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{u.total_bookings}</span>
                        {u.completed_bookings > 0 && (
                          <span className="text-xs text-green-600 ml-1">({u.completed_bookings})</span>
                        )}
                      </td>
                      {/* Properties */}
                      <td className="px-4 py-3 text-center">
                        {u.total_properties > 0 ? (
                          <span>
                            {u.active_properties}/{u.total_properties}
                          </span>
                        ) : (
                          <span className="text-charcoal-400">—</span>
                        )}
                      </td>
                      {/* Messages */}
                      <td className="px-4 py-3 text-center text-charcoal-600">
                        {u.total_messages || 0}
                      </td>
                      {/* Location */}
                      <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">
                        {u.city || u.state ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[u.city, u.state].filter(Boolean).join(', ')}
                          </span>
                        ) : (
                          <span className="text-charcoal-400">—</span>
                        )}
                      </td>
                      {/* Friction */}
                      <td className="px-4 py-3">
                        {u.friction_flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.friction_flags.slice(0, 2).map((f: string) => {
                              const cfg = FRICTION_CONFIG[f]
                              return cfg ? (
                                <span
                                  key={f}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {cfg.label}
                                </span>
                              ) : null
                            })}
                            {u.friction_flags.length > 2 && (
                              <span className="text-[10px] text-charcoal-400">+{u.friction_flags.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </td>
                      {/* Last Active */}
                      <td className="px-4 py-3 text-charcoal-600 text-xs whitespace-nowrap">
                        {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '—'}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/crm/${u.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-xs font-medium"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-mist-200 bg-mist-50">
            <p className="text-xs text-charcoal-500">
              Page {page} of {totalPages} ({total} users)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded border border-mist-300 text-xs hover:bg-white disabled:opacity-50"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded border border-mist-300 text-xs hover:bg-white disabled:opacity-50"
              >
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
