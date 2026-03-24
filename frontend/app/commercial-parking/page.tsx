'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Lock,
  MapPin,
  Plus,
  Upload,
} from 'lucide-react'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'
import { CommercialZonePlanner, type CommercialZoneDraft } from '@/components/CommercialZonePlanner'

const inputClass =
  'w-full rounded-xl border border-mist-300 bg-white px-4 py-3 text-sm text-charcoal-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-200'

const PROPERTY_TYPES = [
  { value: 'surface_lot', label: 'Surface lot' },
  { value: 'garage', label: 'Garage' },
  { value: 'industrial_yard', label: 'Industrial yard' },
  { value: 'mixed_use', label: 'Mixed use' },
  { value: 'rv_storage_lot', label: 'RV / storage lot' },
  { value: 'other', label: 'Other' },
]

const VEHICLE_TYPES = [
  'passenger_vehicle',
  'suv_pickup',
  'cargo_van',
  'oversized_vehicle',
  'rv',
  'truck',
  'trailer',
] as const

const BOOKING_TYPES = [
  'daily',
  'overnight',
  'monthly',
  'long_term_storage',
  'event_parking',
] as const

const SPACE_TYPES = ['standard', 'covered', 'yard', 'oversized', 'storage'] as const
const ACCESS_TYPES = ['ungated', 'gated', 'staffed', 'code', 'remote', 'other'] as const
const AVAILABILITY_TYPES = ['daily', 'overnight', 'monthly', 'long_term_storage', 'event'] as const

const formSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  approximateSpaceCount: z.coerce.number().min(1, 'Add an approximate space count'),
  propertyType: z.string().min(1, 'Property type is required'),
  vehicleTypesAllowed: z.array(z.string()).min(1, 'Choose at least one vehicle type'),
  bookingTypesSupported: z.array(z.string()).min(1, 'Choose at least one booking type'),
  hasSpreadsheet: z.boolean().default(false),
  spreadsheetLater: z.boolean().default(false),
  stripeReady: z.string().default('need_help'),
  notes: z.string().optional(),
  authorityConfirmation: z.boolean().refine(Boolean, 'Required'),
  insuranceComplianceConfirmation: z.boolean().refine(Boolean, 'Required'),
})

type CommercialFormValues = z.infer<typeof formSchema>

interface PropertyDraft {
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  lat?: number
  lng?: number
  propertyType: string
  accessInstructions: string
  restrictions: string
}

interface InventoryBucketDraft {
  id: string
  zoneId?: string
  label: string
  vehicleType: string
  quantity: number
  spaceType?: string
  pricingMode: string
  dailyPrice?: number
  monthlyPrice?: number
  accessType?: string
  availabilityType?: string
  minDuration?: number
  maxDuration?: number
  restrictions?: string
}

const makeId = () => Math.random().toString(36).slice(2, 10)

const defaultPropertyDraft = (): PropertyDraft => ({
  name: '',
  address: '',
  city: '',
  province: 'NS',
  postalCode: '',
  propertyType: 'surface_lot',
  accessInstructions: '',
  restrictions: '',
})

const defaultZone = (): CommercialZoneDraft => ({
  id: makeId(),
  name: 'Main Lot',
  description: 'General parking area',
  isDefaultZone: true,
  isActive: true,
})

const defaultBucket = (zoneId?: string): InventoryBucketDraft => ({
  id: makeId(),
  zoneId,
  label: 'Passenger vehicle inventory',
  vehicleType: 'passenger_vehicle',
  quantity: 20,
  spaceType: 'standard',
  pricingMode: 'flexible',
  accessType: 'ungated',
  availabilityType: 'daily',
})

function prettyLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-charcoal-800">{label}</label>
      {children}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function MultiCheckField({
  title,
  options,
  values,
  onToggle,
  error,
}: {
  title: string
  options: readonly string[]
  values: string[]
  onToggle: (value: string) => void
  error?: string
}) {
  return (
    <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
      <p className="text-sm font-semibold text-charcoal-900">{title}</p>
      <div className="mt-4 grid gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-charcoal-700">
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            {prettyLabel(option)}
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

const STEPS = [
  { id: 1, title: 'Business details', description: 'Your company, inventory size, and parking types.' },
  { id: 2, title: 'Upload and location', description: 'Add your file and tell us where the lot is.' },
  { id: 3, title: 'Zone pins and inventory', description: 'Drop simple zone pins and assign pooled counts.' },
  { id: 4, title: 'Review and submit', description: 'Confirm the details and send for review.' },
] as const

const WHO_ITS_FOR = [
  {
    title: 'Lots, garages, and parkades',
    description: 'Bring structured parking inventory online without rebuilding your operation around individual stall mapping.',
  },
  {
    title: 'Condo, office, and mixed-use properties',
    description: 'Offer resident overflow, staff parking, guest inventory, or after-hours availability with clear zone instructions.',
  },
  {
    title: 'Industrial yards, RV, and storage-style parking',
    description: 'Handle oversized vehicles, trailers, and long-term storage inventory with pooled counts and access notes.',
  },
]

const COMMERCIAL_FEATURES = [
  'Pooled inventory instead of mapping every stall one by one',
  'Simple zone pins so drivers know where to go on larger properties',
  'Daily, monthly, overnight, event, and storage-style booking support',
  'Mixed vehicle types including passenger, oversized, RV, truck, and trailer',
  'Spreadsheet-first onboarding when your inventory already lives in a file',
  'Manual review before launch so signage, access, and payout setup are correct',
]

const REVIEW_TIMELINE = [
  'You submit business details, site information, and any spreadsheet you already have.',
  'We review the setup, confirm the inventory structure, and flag anything missing.',
  'Once approved, we activate the property with pooled counts, zones, and booking rules.',
]

const COMMERCIAL_FAQS = [
  {
    question: 'Do I need to map every parking stall?',
    answer: 'No. Most commercial operators launch faster with pooled inventory by zone, vehicle type, or booking type.',
  },
  {
    question: 'Can I use my existing spreadsheet?',
    answer: 'Yes. If you already manage inventory in CSV or Excel, you can upload it and use the template as a guide.',
  },
  {
    question: 'Do I need an account before submitting?',
    answer: 'You need an account to save the submission, track status, and connect the property to the payout profile that will receive earnings.',
  },
  {
    question: 'Can plekk support monthly or long-term parking?',
    answer: 'Yes. The flow supports recurring-style inventory such as monthly parking, overnight parking, and long-term storage scenarios.',
  },
]

const COMMERCIAL_BENEFITS = [
  {
    title: 'Turn idle capacity into revenue',
    description: 'Open daily, monthly, overnight, event, or mixed-use inventory without creating one listing per stall.',
  },
  {
    title: 'Keep operational control',
    description: 'Set booking types, access rules, and where drivers should park while keeping your on-site process clear.',
  },
  {
    title: 'Launch without rebuilding everything',
    description: 'Use pooled inventory, zone guidance, and your existing site signage instead of a heavy custom rollout.',
  },
]

const HOW_PLEKK_WORKS = [
  {
    title: 'Define the property once',
    description: 'After sign-in, you add the site, inventory structure, and any supporting file inside the authenticated workflow.',
  },
  {
    title: 'plekk turns it into a bookable product',
    description: 'We structure the property for real booking behaviour, including zones, durations, and vehicle types.',
  },
  {
    title: 'Drivers book with clarity',
    description: 'Customers know what they are booking, where to go, and how the property works before they arrive.',
  },
]

const PUBLIC_PREVIEW_STEPS = [
  {
    id: 1,
    eyebrow: 'Step 1',
    title: 'Add the basics',
    description: 'Start with the property, operator, and inventory profile so plekk can shape the right commercial setup.',
    bullets: [
      'Property type, city, and approximate space count',
      'Vehicle types and booking types you want to support',
      'A structure designed for lots, garages, yards, and mixed-use sites',
    ],
    effort: 'About 2 minutes',
  },
  {
    id: 2,
    eyebrow: 'Step 2',
    title: 'Bring your existing inventory',
    description: 'If you already track spaces in a spreadsheet, plekk meets you there instead of forcing a rebuild.',
    bullets: [
      'Upload CSV or spreadsheet files inside the authenticated workflow',
      'Keep existing inventory logic as the starting point',
      'Use the template only if you need a cleaner format',
    ],
    effort: 'About 3 minutes',
  },
  {
    id: 3,
    eyebrow: 'Step 3',
    title: 'Define where drivers should go',
    description: 'Use simple zones and pooled counts so the property makes sense operationally without mapping every stall.',
    bullets: [
      'Zone-based instructions for larger properties',
      'Pooled inventory by vehicle type or use case',
      'Cleaner driver guidance with less operational overhead',
    ],
    effort: 'About 4 minutes',
  },
  {
    id: 4,
    eyebrow: 'Step 4',
    title: 'Review and submit for launch',
    description: 'Once the structure is clear, create your account, finish the real flow, and submit the property to plekk.',
    bullets: [
      'Authenticated setup keeps uploads and operational details private',
      'Submission status stays tied to your host account',
      'plekk reviews the setup before launch',
    ],
    effort: 'Ready to submit',
  },
] as const

export default function CommercialParkingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const submissionId = searchParams.get('submission')
  const submissionToken = searchParams.get('token')
  const callUrl = process.env.NEXT_PUBLIC_COMMERCIAL_CALL_URL
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [publicPreviewStep, setPublicPreviewStep] = useState<1 | 2 | 3 | 4>(1)
  const [propertyDraft, setPropertyDraft] = useState<PropertyDraft>(defaultPropertyDraft)
  const [zones, setZones] = useState<CommercialZoneDraft[]>([defaultZone()])
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(undefined)
  const [inventoryBuckets, setInventoryBuckets] = useState<InventoryBucketDraft[]>([])
  const [plannerMode, setPlannerMode] = useState<'property' | 'zone'>('property')
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any | null>(null)
  const [statusData, setStatusData] = useState<any | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CommercialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      province: 'NS',
      propertyType: 'surface_lot',
      vehicleTypesAllowed: ['passenger_vehicle'],
      bookingTypesSupported: ['daily', 'monthly'],
      hasSpreadsheet: false,
      spreadsheetLater: false,
      stripeReady: 'need_help',
      authorityConfirmation: false,
      insuranceComplianceConfirmation: false,
      notes: '',
    },
  })

  useEffect(() => {
    if (zones.length === 0 || inventoryBuckets.length > 0) return
    setSelectedZoneId(zones[0]?.id)
    setInventoryBuckets([defaultBucket(zones[0]?.id)])
  }, [zones, inventoryBuckets.length])

  useEffect(() => {
    if (!submissionId || !submissionToken) return
    setStatusLoading(true)
    apiService
      .getCommercialLeadStatus(submissionId, submissionToken)
      .then((response) => {
        if (response.success && response.data) setStatusData(response.data)
      })
      .catch(() => toast.error('Unable to load your submission status'))
      .finally(() => setStatusLoading(false))
  }, [submissionId, submissionToken])

  const watchedVehicleTypes = watch('vehicleTypesAllowed')
  const watchedBookingTypes = watch('bookingTypesSupported')
  const watchedValues = watch()

  const zoneOptions = useMemo(
    () => zones.map((zone) => ({ value: zone.id, label: zone.name || 'Untitled zone' })),
    [zones]
  )

  const summaryItems = useMemo(
    () => [
      ['Company', watchedValues.companyName || 'Not added'],
      ['Property', propertyDraft.name || propertyDraft.address || 'Not added'],
      ['Spaces', watchedValues.approximateSpaceCount ? String(watchedValues.approximateSpaceCount) : 'Not added'],
      ['CSV upload', spreadsheetFile?.name || (watchedValues.spreadsheetLater ? 'Sending later' : 'Not added')],
      ['Zones', `${zones.length}`],
      ['Inventory buckets', `${inventoryBuckets.length}`],
    ],
    [inventoryBuckets.length, propertyDraft.address, propertyDraft.name, spreadsheetFile?.name, watchedValues.approximateSpaceCount, watchedValues.companyName, watchedValues.spreadsheetLater, zones.length]
  )

  const updatePropertyDraft = (patch: Partial<PropertyDraft>) => {
    setPropertyDraft((current) => ({ ...current, ...patch }))
  }

  const syncDefaultZone = (coords?: { lat?: number; lng?: number }) => {
    setZones((current) =>
      current.map((zone, index) =>
        index === 0 && zone.isDefaultZone
          ? {
              ...zone,
              lat: coords?.lat ?? propertyDraft.lat,
              lng: coords?.lng ?? propertyDraft.lng,
            }
          : zone
      )
    )
  }

  const handleAddressSelect = (place: any) => {
    const provinceContext = place.context?.find((context: any) => context.id.startsWith('region'))
    const cityContext = place.context?.find((context: any) => context.id.startsWith('place'))
    const postalContext = place.context?.find((context: any) => context.id.startsWith('postcode'))
    const nextDraft = {
      address: place.place_name,
      city: cityContext?.text || propertyDraft.city,
      province: provinceContext?.short_code?.split('-')[1] || provinceContext?.text || propertyDraft.province,
      postalCode: postalContext?.text || propertyDraft.postalCode,
      lng: place.center?.[0],
      lat: place.center?.[1],
    }
    updatePropertyDraft(nextDraft)
    syncDefaultZone({ lat: nextDraft.lat, lng: nextDraft.lng })
  }

  const handlePropertyLocationChange = (coords: { lat: number; lng: number }) => {
    updatePropertyDraft(coords)
    syncDefaultZone(coords)
  }

  const handleZoneLocationChange = (zoneId: string, coords: { lat: number; lng: number }) => {
    setZones((current) => current.map((zone) => (zone.id === zoneId ? { ...zone, ...coords } : zone)))
  }

  const addZone = () => {
    const nextZone = {
      id: makeId(),
      name: `Zone ${zones.length + 1}`,
      isDefaultZone: false,
      isActive: true,
    }
    setZones((current) => [...current, nextZone])
    setSelectedZoneId(nextZone.id)
    setPlannerMode('zone')
  }

  const addInventoryBucket = () => {
    setInventoryBuckets((current) => [...current, defaultBucket(selectedZoneId || zoneOptions[0]?.value)])
  }

  const goToStep = async (step: 1 | 2 | 3 | 4) => {
    if (step <= currentStep) {
      setCurrentStep(step)
      return
    }

    if (currentStep === 1) {
      const valid = await trigger([
        'companyName',
        'contactName',
        'email',
        'phone',
        'city',
        'province',
        'approximateSpaceCount',
        'propertyType',
        'vehicleTypesAllowed',
        'bookingTypesSupported',
      ])
      if (!valid) {
        toast.error('Please complete the required business details first.')
        return
      }
    }

    if (currentStep === 2) {
      if (!propertyDraft.address || !propertyDraft.lat || !propertyDraft.lng) {
        toast.error('Add the property address before moving to zone setup.')
        return
      }
    }

    if (currentStep === 3) {
      const missingPins = zones.some((zone) => zone.lat == null || zone.lng == null)
      if (missingPins) {
        toast.error('Place a pin for each zone before reviewing.')
        return
      }
      if (inventoryBuckets.length === 0) {
        toast.error('Add at least one inventory bucket before reviewing.')
        return
      }
    }

    setCurrentStep(step)
  }

  const onSubmit = async (values: CommercialFormValues) => {
    const valid = await trigger()
    if (!valid) {
      setCurrentStep(1)
      toast.error('Please complete the required fields before submitting.')
      return
    }

    if (!propertyDraft.address || !propertyDraft.lat || !propertyDraft.lng) {
      setCurrentStep(2)
      toast.error('Add the property location before submitting.')
      return
    }

    const missingPins = zones.some((zone) => zone.lat == null || zone.lng == null)
    if (missingPins || inventoryBuckets.length === 0) {
      setCurrentStep(3)
      toast.error('Finish the zone and inventory step before submitting.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value ?? ''))
        }
      })
      formData.append('propertyDraft', JSON.stringify(propertyDraft))
      formData.append('zonesDraft', JSON.stringify(zones))
      formData.append('inventoryBucketsDraft', JSON.stringify(inventoryBuckets))
      if (spreadsheetFile) formData.append('spreadsheetUpload', spreadsheetFile)

      const response = await apiService.submitCommercialLead(formData)
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || 'Submission failed')
      }
      setSubmissionResult(response.data)
      toast.success('Your commercial parking request has been submitted.')
      setCurrentStep(4)
    } catch (error: any) {
      toast.error(error.message || 'Unable to submit commercial parking request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen bg-mist-100 flex items-center justify-center text-charcoal-600">Loading...</div>
  }

  if (!user) {
    const redirectTarget = encodeURIComponent('/commercial-parking')
    const activePublicStep = PUBLIC_PREVIEW_STEPS.find((step) => step.id === publicPreviewStep) || PUBLIC_PREVIEW_STEPS[0]
    const publicProgress = (publicPreviewStep / PUBLIC_PREVIEW_STEPS.length) * 100
    return (
      <div className="min-h-screen bg-gradient-to-br from-mist-100 via-white to-sand-100">
        <section className="overflow-hidden border-b border-mist-200 bg-charcoal-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-accent-300" />
                  Commercial parking
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Turn commercial parking into a cleaner, bookable revenue stream
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-mist-200">
                  plekk helps operators list lots, garages, mixed-use sites, and oversized inventory in a format drivers can actually understand and book.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm text-mist-100">
                    Pooled inventory for larger properties
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm text-mist-100">
                    Daily, monthly, overnight, event, and storage-ready setups
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/auth/signup?redirect=${redirectTarget}&host=true&intent=commercial-host`}
                    className="inline-flex items-center rounded-xl bg-accent-400 px-5 py-3 font-semibold text-charcoal-900 transition hover:bg-accent-300"
                  >
                    Start setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  {callUrl && (
                    <Link
                      href={callUrl}
                      className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                    >
                      Book a call
                    </Link>
                  )}
                </div>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-300">Why operators use plekk</p>
                <div className="mt-5 space-y-4">
                  {COMMERCIAL_BENEFITS.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-mist-200">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-charcoal-950/40 p-4 text-sm text-mist-200">
                  Visitors can preview the onboarding flow here. Uploads, property details, and final submission stay inside the authenticated host workflow.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-mist-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Try the setup flow</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal-900">
                  See the onboarding before you commit to it
                </h2>
                <p className="mt-4 text-charcoal-600">
                  Strong PLG onboarding reduces friction. This preview shows the commercial setup in manageable steps, then asks you to create an account at the point where real data and uploads begin to matter.
                </p>

                <div className="mt-8 rounded-3xl border border-mist-200 bg-mist-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-900">Preview progress</p>
                      <p className="mt-1 text-sm text-charcoal-600">
                        Step {publicPreviewStep} of {PUBLIC_PREVIEW_STEPS.length}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-accent-700">{Math.round(publicProgress)}%</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-primary-600 transition-all duration-300"
                      style={{ width: `${publicProgress}%` }}
                    />
                  </div>
                  <div className="mt-5 space-y-2">
                    {PUBLIC_PREVIEW_STEPS.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setPublicPreviewStep(step.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          publicPreviewStep === step.id
                            ? 'border-accent-300 bg-white shadow-sm'
                            : 'border-transparent bg-transparent hover:border-mist-200 hover:bg-white/80'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-charcoal-900">{step.title}</p>
                          <p className="mt-1 text-xs text-charcoal-500">{step.effort}</p>
                        </div>
                        {step.id > publicPreviewStep ? (
                          <Lock className="h-4 w-4 text-charcoal-400" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-900 text-xs font-bold text-white">
                            {step.id}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-mist-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{activePublicStep.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal-900">{activePublicStep.title}</h3>
                  </div>
                  <div className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
                    {activePublicStep.effort}
                  </div>
                </div>
                <p className="mt-4 text-charcoal-600">{activePublicStep.description}</p>

                <div className="mt-6 space-y-3">
                  {activePublicStep.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3 rounded-2xl bg-mist-50 px-4 py-3 text-sm text-charcoal-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-accent-100 bg-accent-50 p-4 text-sm text-charcoal-700">
                  {publicPreviewStep < 4
                    ? 'You can preview the flow step by step here. When you are ready to enter real property data, plekk moves you into the authenticated host workflow.'
                    : 'This is the handoff point: create an account to continue with the real commercial setup, uploads, and submission.'}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {publicPreviewStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setPublicPreviewStep((Math.min(4, publicPreviewStep + 1) as 1 | 2 | 3 | 4))}
                      className="inline-flex items-center rounded-xl bg-charcoal-900 px-5 py-3 font-semibold text-white"
                    >
                      Continue preview
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      href={`/auth/signup?redirect=${redirectTarget}&host=true&intent=commercial-host`}
                      className="inline-flex items-center rounded-xl bg-accent-500 px-5 py-3 font-semibold text-white transition hover:bg-accent-600"
                    >
                      Create account to continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  )}
                  <Link
                    href={`/auth/signin?redirect=${redirectTarget}`}
                    className="inline-flex items-center rounded-xl border border-mist-300 bg-white px-5 py-3 font-semibold text-charcoal-800 transition hover:bg-mist-50"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-mist-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Built for commercial operators</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal-900">
                The model works when a property is bigger than a simple driveway listing
              </h2>
              <p className="mt-4 text-lg text-charcoal-600">
                If your site has multiple rows, mixed durations, oversized vehicles, or access instructions that matter, plekk&apos;s commercial flow is designed to present that inventory clearly.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {WHO_ITS_FOR.map((item) => (
                <div key={item.title} className="rounded-3xl border border-mist-200 bg-mist-50 p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-charcoal-900 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-charcoal-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-charcoal-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-mist-200 bg-gradient-to-br from-mist-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">How it works</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal-900">
                  Commercial onboarding without a messy listing experience
                </h2>
                <p className="mt-4 text-charcoal-600">
                  The public page explains the model. The authenticated workflow handles the real setup. That keeps the marketing page focused and the operational tooling where it belongs.
                </p>
                <div className="mt-6 rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-charcoal-900">What plekk makes easier</p>
                  <div className="mt-4 space-y-3">
                    {COMMERCIAL_FEATURES.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-charcoal-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {HOW_PLEKK_WORKS.map((step, index) => (
                  <div key={step.title} className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-500 text-base font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-charcoal-900">{step.title}</p>
                        <p className="mt-2 text-sm leading-6 text-charcoal-600">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-mist-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Launch support</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal-900">
                  You do not need to figure out the structure alone
                </h2>
                <p className="mt-4 text-charcoal-600">
                  plekk reviews the setup before launch so the property, inventory logic, and driver guidance make sense in the real world, not just in a spreadsheet.
                </p>
                {callUrl && (
                  <Link
                    href={callUrl}
                    className="mt-6 inline-flex items-center rounded-xl bg-charcoal-900 px-5 py-3 font-semibold text-white"
                  >
                    Book a call
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </div>
              <div className="space-y-4">
                {REVIEW_TIMELINE.map((item, index) => (
                  <div key={item} className="rounded-3xl border border-mist-200 bg-mist-50 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-charcoal-900 shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-charcoal-700">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">FAQ</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal-900">
                  Common operator questions
                </h2>
                <p className="mt-4 text-charcoal-600">
                  This page is here to explain the product and reduce the fear of starting. The actual setup, uploads, and submission actions happen only after sign-in.
                </p>
              </div>
              <div className="space-y-4">
                {COMMERCIAL_FAQS.map((item) => (
                  <div key={item.question} className="rounded-3xl border border-mist-200 bg-mist-50 p-6 shadow-sm">
                    <p className="text-base font-semibold text-charcoal-900">{item.question}</p>
                    <p className="mt-3 text-sm leading-6 text-charcoal-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 rounded-[2rem] border border-charcoal-200 bg-charcoal-900 px-6 py-8 text-white shadow-lg sm:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-300">Ready to submit?</p>
                  <h3 className="mt-2 text-2xl font-bold">If the model fits your property, create an account and continue the real setup.</h3>
                  <p className="mt-3 text-sm text-mist-200">
                    This public page previews the flow and sells the product. The authenticated host flow is where your property details, files, and submission are actually managed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/auth/signup?redirect=${redirectTarget}&host=true&intent=commercial-host`}
                    className="inline-flex items-center rounded-xl bg-accent-400 px-5 py-3 font-semibold text-charcoal-900 transition hover:bg-accent-300"
                  >
                    Create account to start
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  {callUrl && (
                    <Link
                      href={callUrl}
                      className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                    >
                      Book a call
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 via-white to-sand-100">
      <section className="border-b border-mist-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-4 py-2 text-sm font-medium text-accent-800">
                <Building2 className="h-4 w-4" />
                Commercial parking onboarding
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-charcoal-900 sm:text-4xl">
                Add commercial parking in a few clear steps
              </h1>
              <p className="mt-3 max-w-2xl text-base text-charcoal-600">
                Tell us about your property, upload your inventory file if you have one, and place simple pins for the areas where drivers should park.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/commercial-inventory-template.csv"
                className="inline-flex items-center rounded-xl border border-mist-300 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal-800"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-accent-700" />
                Download CSV template
              </a>
              {callUrl && (
                <Link
                  href={callUrl}
                  className="inline-flex items-center rounded-xl bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Book a call
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {(submissionResult || statusData || statusLoading) && (
        <section className="border-b border-mist-200 bg-accent-50">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-accent-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Submission status</p>
              {statusLoading ? (
                <p className="mt-2 text-charcoal-700">Loading your submission...</p>
              ) : (
                <>
                  <p className="mt-2 text-xl font-semibold text-charcoal-900">
                    {(statusData || submissionResult)?.status === 'approved'
                      ? 'Approved'
                      : (statusData || submissionResult)?.status === 'needs-info'
                      ? 'We need a few more details'
                      : (statusData || submissionResult)?.status === 'reviewing'
                      ? 'Under review'
                      : (statusData || submissionResult)?.status === 'rejected'
                      ? 'Not approved'
                      : 'Submitted'}
                  </p>
                  <p className="mt-1 text-sm text-charcoal-600">
                    Reference: <span className="font-medium text-charcoal-900">{statusData?.id || submissionResult?.id}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5">
          <div className="rounded-3xl border border-mist-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-charcoal-900">Progress</p>
            <div className="mt-4 space-y-3">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    currentStep === step.id
                      ? 'border-accent-300 bg-accent-50'
                      : currentStep > step.id
                      ? 'border-mist-200 bg-mist-50'
                      : 'border-mist-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-900">{step.title}</p>
                      <p className="mt-1 text-xs text-charcoal-600">{step.description}</p>
                    </div>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        currentStep >= step.id ? 'bg-accent-500 text-white' : 'bg-mist-100 text-charcoal-600'
                      }`}
                    >
                      {currentStep > step.id ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-mist-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-charcoal-900">Submission summary</p>
            <div className="mt-4 space-y-3 text-sm">
              {summaryItems.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-charcoal-500">{label}</span>
                  <span className="max-w-[150px] text-right font-medium text-charcoal-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-mist-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-charcoal-900">What to expect</p>
            <div className="mt-4 space-y-3 text-sm text-charcoal-600">
              <p>Pooled inventory is the default. You do not need to map every stall.</p>
              <p>Zone pins help drivers understand where to park inside a larger property.</p>
              <p>Existing on-site signage can usually be reused.</p>
            </div>
          </div>
        </aside>

        <main>
          <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm sm:p-8">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-charcoal-900">Business details</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Start with the basics so we understand what kind of parking inventory you manage.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Company name" error={errors.companyName?.message}>
                    <input {...register('companyName')} className={inputClass} placeholder="Harbourfront Parking Ltd." />
                  </Field>
                  <Field label="Contact name" error={errors.contactName?.message}>
                    <input {...register('contactName')} className={inputClass} placeholder="Jane Smith" />
                  </Field>
                  <Field label="Email" error={errors.email?.message}>
                    <input {...register('email')} type="email" className={inputClass} placeholder="ops@example.com" />
                  </Field>
                  <Field label="Phone" error={errors.phone?.message}>
                    <input {...register('phone')} className={inputClass} placeholder="902-555-0147" />
                  </Field>
                  <Field label="City" error={errors.city?.message}>
                    <input {...register('city')} className={inputClass} placeholder="Halifax" />
                  </Field>
                  <Field label="Province" error={errors.province?.message}>
                    <input {...register('province')} className={inputClass} placeholder="NS" />
                  </Field>
                  <Field label="Approximate space count" error={errors.approximateSpaceCount?.message}>
                    <input {...register('approximateSpaceCount')} type="number" min={1} className={inputClass} placeholder="100" />
                  </Field>
                  <Field label="Property type" error={errors.propertyType?.message}>
                    <select {...register('propertyType')} className={inputClass}>
                      {PROPERTY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <MultiCheckField
                    title="Vehicle types allowed"
                    options={VEHICLE_TYPES}
                    values={watchedVehicleTypes || []}
                    onToggle={(value) => {
                      const next = watchedVehicleTypes?.includes(value)
                        ? watchedVehicleTypes.filter((item) => item !== value)
                        : [...(watchedVehicleTypes || []), value]
                      setValue('vehicleTypesAllowed', next, { shouldValidate: true })
                    }}
                    error={errors.vehicleTypesAllowed?.message}
                  />
                  <MultiCheckField
                    title="Booking types supported"
                    options={BOOKING_TYPES}
                    values={watchedBookingTypes || []}
                    onToggle={(value) => {
                      const next = watchedBookingTypes?.includes(value)
                        ? watchedBookingTypes.filter((item) => item !== value)
                        : [...(watchedBookingTypes || []), value]
                      setValue('bookingTypesSupported', next, { shouldValidate: true })
                    }}
                    error={errors.bookingTypesSupported?.message}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="inline-flex items-center rounded-xl bg-charcoal-900 px-5 py-3 font-semibold text-white"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Step 2</p>
                  <h2 className="mt-2 text-2xl font-semibold text-charcoal-900">Upload and location</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Upload your spreadsheet if you have one, then confirm the property location so you can place zone pins in the next step.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
                    <p className="text-sm font-semibold text-charcoal-900">Inventory file</p>
                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-mist-300 bg-white px-4 py-4 text-sm text-charcoal-700">
                      <Upload className="h-4 w-4 text-accent-700" />
                      <span>{spreadsheetFile ? spreadsheetFile.name : 'Upload CSV, XLSX, XLS, or PDF'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.xls,.xlsx,.pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null
                          setSpreadsheetFile(file)
                          setValue('hasSpreadsheet', !!file, { shouldValidate: true })
                        }}
                      />
                    </label>
                    <div className="mt-4 space-y-2 text-sm text-charcoal-600">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" {...register('hasSpreadsheet')} />
                        We already have inventory in a spreadsheet
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" {...register('spreadsheetLater')} />
                        We will send the spreadsheet later
                      </label>
                    </div>
                    <a href="/commercial-inventory-template.csv" className="mt-4 inline-flex items-center text-sm font-semibold text-accent-700">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download template
                    </a>
                  </div>

                  <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
                    <p className="text-sm font-semibold text-charcoal-900">Payout readiness</p>
                    <select {...register('stripeReady')} className={`${inputClass} mt-4`}>
                      <option value="ready">Stripe account ready</option>
                      <option value="need_help">Need help setting up Stripe</option>
                      <option value="not_yet">Not ready yet</option>
                    </select>
                    <Field label="Notes or site restrictions" className="mt-4">
                      <textarea
                        {...register('notes')}
                        rows={5}
                        className={inputClass}
                        placeholder="Gate timing, oversized access rules, lot access notes, or anything else we should know."
                      />
                    </Field>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Property name">
                    <input
                      value={propertyDraft.name}
                      onChange={(event) => updatePropertyDraft({ name: event.target.value })}
                      className={inputClass}
                      placeholder="Harbour Lot"
                    />
                  </Field>
                  <Field label="Property type">
                    <select
                      value={propertyDraft.propertyType}
                      onChange={(event) => updatePropertyDraft({ propertyType: event.target.value })}
                      className={inputClass}
                    >
                      {PROPERTY_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Property address">
                      <MapboxAutocomplete
                        value={propertyDraft.address}
                        onChange={(value) => updatePropertyDraft({ address: value })}
                        onSelect={handleAddressSelect}
                        placeholder="Search a property address"
                        preferAddress
                      />
                    </Field>
                  </div>
                  <Field label="City">
                    <input value={propertyDraft.city} onChange={(event) => updatePropertyDraft({ city: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Province">
                    <input value={propertyDraft.province} onChange={(event) => updatePropertyDraft({ province: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Postal code">
                    <input value={propertyDraft.postalCode} onChange={(event) => updatePropertyDraft({ postalCode: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Access instructions">
                    <input
                      value={propertyDraft.accessInstructions}
                      onChange={(event) => updatePropertyDraft({ accessInstructions: event.target.value })}
                      className={inputClass}
                      placeholder="Enter through gate on Water Street"
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => goToStep(1)} className="rounded-xl border border-mist-300 px-5 py-3 font-semibold text-charcoal-700">
                    Back
                  </button>
                  <button type="button" onClick={() => goToStep(3)} className="inline-flex items-center rounded-xl bg-charcoal-900 px-5 py-3 font-semibold text-white">
                    Continue to zone pins
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Step 3</p>
                  <h2 className="mt-2 text-2xl font-semibold text-charcoal-900">Zone pins and inventory</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Drop a simple pin for each area drivers should use. Then assign pooled inventory counts by vehicle type.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlannerMode('property')}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${plannerMode === 'property' ? 'bg-charcoal-900 text-white' : 'bg-mist-100 text-charcoal-700'}`}
                  >
                    Set property pin
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlannerMode('zone')}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${plannerMode === 'zone' ? 'bg-charcoal-900 text-white' : 'bg-mist-100 text-charcoal-700'}`}
                  >
                    Set selected zone pin
                  </button>
                  <button type="button" onClick={addZone} className="inline-flex items-center rounded-full border border-mist-300 px-4 py-2 text-sm font-medium text-charcoal-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add zone
                  </button>
                </div>

                <CommercialZonePlanner
                  propertyLocation={{ lat: propertyDraft.lat, lng: propertyDraft.lng }}
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  placementMode={plannerMode}
                  onPropertyLocationChange={handlePropertyLocationChange}
                  onZoneLocationChange={handleZoneLocationChange}
                />

                <div className="space-y-4">
                  {zones.map((zone) => (
                    <div key={zone.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZoneId(zone.id)
                            setPlannerMode('zone')
                          }}
                          className={`rounded-full px-3 py-1 text-sm font-medium ${selectedZoneId === zone.id ? 'bg-accent-500 text-white' : 'bg-white text-charcoal-700'}`}
                        >
                          Select zone
                        </button>
                        <div className="text-xs text-charcoal-500">
                          {zone.lat != null && zone.lng != null ? `${zone.lat.toFixed(5)}, ${zone.lng.toFixed(5)}` : 'Pin not placed yet'}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Zone name">
                          <input
                            value={zone.name}
                            onChange={(event) => setZones((current) => current.map((item) => (item.id === zone.id ? { ...item, name: event.target.value } : item)))}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Zone notes">
                          <input
                            value={zone.description || ''}
                            onChange={(event) => setZones((current) => current.map((item) => (item.id === zone.id ? { ...item, description: event.target.value } : item)))}
                            className={inputClass}
                            placeholder="Examples: north row near fence, RV section, truck yard"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-900">Pooled inventory buckets</p>
                      <p className="mt-1 text-sm text-charcoal-600">
                        Example: Main Lot: 100 passenger vehicle spaces. RV Area: 20 RV spaces.
                      </p>
                    </div>
                    <button type="button" onClick={addInventoryBucket} className="inline-flex items-center rounded-full border border-mist-300 px-4 py-2 text-sm font-medium text-charcoal-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Add bucket
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {inventoryBuckets.map((bucket) => (
                      <div key={bucket.id} className="rounded-2xl border border-mist-200 bg-white p-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <Field label="Bucket label">
                            <input
                              value={bucket.label}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, label: event.target.value } : item)))}
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Zone">
                            <select
                              value={bucket.zoneId || zoneOptions[0]?.value || ''}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, zoneId: event.target.value } : item)))}
                              className={inputClass}
                            >
                              {zoneOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Vehicle type">
                            <select
                              value={bucket.vehicleType}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, vehicleType: event.target.value } : item)))}
                              className={inputClass}
                            >
                              {VEHICLE_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {prettyLabel(option)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Quantity">
                            <input
                              type="number"
                              min={0}
                              value={bucket.quantity}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, quantity: Number(event.target.value) } : item)))}
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Space type">
                            <select
                              value={bucket.spaceType || 'standard'}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, spaceType: event.target.value } : item)))}
                              className={inputClass}
                            >
                              {SPACE_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {prettyLabel(option)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Access type">
                            <select
                              value={bucket.accessType || 'ungated'}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, accessType: event.target.value } : item)))}
                              className={inputClass}
                            >
                              {ACCESS_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {prettyLabel(option)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Availability">
                            <select
                              value={bucket.availabilityType || 'daily'}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, availabilityType: event.target.value } : item)))}
                              className={inputClass}
                            >
                              {AVAILABILITY_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {prettyLabel(option)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Daily price">
                            <input
                              type="number"
                              min={0}
                              value={bucket.dailyPrice ?? ''}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, dailyPrice: Number(event.target.value) || undefined } : item)))}
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Monthly price">
                            <input
                              type="number"
                              min={0}
                              value={bucket.monthlyPrice ?? ''}
                              onChange={(event) => setInventoryBuckets((current) => current.map((item) => (item.id === bucket.id ? { ...item, monthlyPrice: Number(event.target.value) || undefined } : item)))}
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => goToStep(2)} className="rounded-xl border border-mist-300 px-5 py-3 font-semibold text-charcoal-700">
                    Back
                  </button>
                  <button type="button" onClick={() => goToStep(4)} className="inline-flex items-center rounded-xl bg-charcoal-900 px-5 py-3 font-semibold text-white">
                    Review details
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Step 4</p>
                  <h2 className="mt-2 text-2xl font-semibold text-charcoal-900">Review and submit</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Confirm the details below. Once submitted, your request will appear in your status view and in the admin review queue.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
                    <p className="text-sm font-semibold text-charcoal-900">Business</p>
                    <div className="mt-4 space-y-3 text-sm text-charcoal-700">
                      <p><strong>{watchedValues.companyName}</strong></p>
                      <p>{watchedValues.contactName} • {watchedValues.email}</p>
                      <p>{watchedValues.city}, {watchedValues.province}</p>
                      <p>{watchedValues.approximateSpaceCount} spaces • {prettyLabel(watchedValues.propertyType)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
                    <p className="text-sm font-semibold text-charcoal-900">Property</p>
                    <div className="mt-4 space-y-3 text-sm text-charcoal-700">
                      <p><strong>{propertyDraft.name || 'Unnamed property'}</strong></p>
                      <p>{propertyDraft.address}</p>
                      <p>{zones.length} zones • {inventoryBuckets.length} pooled inventory buckets</p>
                      <p>{spreadsheetFile?.name || (watchedValues.spreadsheetLater ? 'Spreadsheet coming later' : 'No file attached')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-mist-200 bg-mist-50 p-5">
                  <label className="flex items-start gap-3 text-sm text-charcoal-700">
                    <input type="checkbox" className="mt-1" {...register('authorityConfirmation')} />
                    <span>
                      I confirm I have authority to offer these spaces and that listing them does not violate applicable property, lease, insurance, zoning, or site rules.
                    </span>
                  </label>
                  {errors.authorityConfirmation?.message && <p className="text-sm text-red-600">{errors.authorityConfirmation.message}</p>}
                  <label className="flex items-start gap-3 text-sm text-charcoal-700">
                    <input type="checkbox" className="mt-1" {...register('insuranceComplianceConfirmation')} />
                    <span>
                      I confirm my organization has reviewed any applicable insurance, liability, and site compliance requirements for listing these spaces.
                    </span>
                  </label>
                  {errors.insuranceComplianceConfirmation?.message && (
                    <p className="text-sm text-red-600">{errors.insuranceComplianceConfirmation.message}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-accent-100 bg-accent-50 p-5 text-sm text-charcoal-700">
                  plekk is a booking marketplace. It does not provide insurance. Most commercial locations can launch with pooled inventory, clear zone instructions, and existing on-site signage.
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => goToStep(3)} className="rounded-xl border border-mist-300 px-5 py-3 font-semibold text-charcoal-700">
                    Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center rounded-xl bg-charcoal-900 px-6 py-3 font-semibold text-white disabled:opacity-60">
                    {isSubmitting ? 'Submitting...' : 'Submit commercial parking request'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  )
}
