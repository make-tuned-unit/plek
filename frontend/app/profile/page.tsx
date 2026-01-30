'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Star,
  Edit,
  Save,
  X,
  Car,
  CreditCard,
  Settings,
  LogOut,
  Camera,
  Plus,
  Trash2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bell,
  Shield
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import toast from 'react-hot-toast'
import { MapboxAutocomplete } from '../../components/MapboxAutocomplete'
import { BookingMessages } from '../../components/BookingMessages'
import { ReviewModal } from '../../components/ReviewModal'
// VerificationStatus component removed - verification system was removed

const PROFILE_BANNER_DISMISSED_KEY = 'plekk_profile_banner_dismissed'

function ProfileCompleteBanner({ user, onEditProfile }: { user: any; onEditProfile?: () => void }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setDismissed(localStorage.getItem(PROFILE_BANNER_DISMISSED_KEY) === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  const isIncomplete = user && (
    !user.phone?.trim() ||
    !user.address?.trim() ||
    !user.country?.trim()
  )

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROFILE_BANNER_DISMISSED_KEY, 'true')
      setDismissed(true)
    } catch {
      setDismissed(false)
    }
  }

  if (!isIncomplete || dismissed) return null

  return (
    <div className="mb-6 rounded-xl bg-accent-50 border border-accent-200 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-accent-900">
          Complete your profile — add your phone, address, and country so we can show you local currency and improve your experience.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onEditProfile}
          className="px-4 py-2 text-sm font-semibold text-white bg-accent-500 rounded-lg hover:bg-accent-600"
        >
          Edit profile
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-2 text-accent-600 hover:text-accent-800 rounded-lg hover:bg-accent-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

// Country options for profile (ISO 3166-1 alpha-2 code as value)
const COUNTRY_OPTIONS = [
  { value: '', label: 'Select country' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IE', label: 'Ireland' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'MX', label: 'Mexico' },
  { value: 'IN', label: 'India' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
]



// Bookings will be fetched from API

const mockListings = [
  {
    id: 1,
    title: 'My Downtown Driveway',
    address: '123 Main St, Downtown',
    price: 15,
    status: 'active',
    bookings: 8,
    earnings: 120.00,
    rating: 4.9,
    reviews: 5,
  },
  {
    id: 2,
    title: 'Residential Parking Space',
    address: '456 Oak Ave, Residential Area',
    price: 8,
    status: 'inactive',
    bookings: 3,
    earnings: 24.00,
    rating: 4.7,
    reviews: 3,
  },
]

function ProfileContent() {
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, logout, isLoading: authLoading, updateProfile, refreshUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Add Listing functionality - moved to top to avoid hooks after early returns
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string>('pending');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeNeedsVerification, setStripeNeedsVerification] = useState(false);
  const [stripeVerificationUrl, setStripeVerificationUrl] = useState<string | null>(null);
  const [pendingEarnings, setPendingEarnings] = useState<number>(0);
  const [hostEarnings, setHostEarnings] = useState<{
    totalGross: number;
    totalPlatformFee: number;
    netEarnings: number;
    pendingPayout: number;
    breakdown: Array<{
      bookingId: string;
      propertyTitle: string;
      totalAmount: number;
      bookerServiceFee: number;
      grossAmount: number;
      platformFee: number;
      yourEarnings: number;
      startTime: string;
    }>;
  } | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [hostBookings, setHostBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingView, setBookingView] = useState<'renter' | 'host' | 'all'>('all');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedBookingForMessages, setSelectedBookingForMessages] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'inbox' | 'history'>('inbox');
  const [hasFetchedNotifications, setHasFetchedNotifications] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<{
    bookingId: string;
    propertyTitle?: string;
    reviewedUserName?: string;
  } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [listingFormData, setListingFormData] = useState({
    title: '',
    address: '',
    price: '',
    description: '',
    coordinates: null as [number, number] | null,
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'driveway' as string,
    features: [] as string[],
    requireApproval: false,
    leadTimeHours: 0,
    availability: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '17:00', available: true },
      sunday: { start: '09:00', end: '17:00', available: true }
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zipCode: user?.zipCode || '',
    },
  })

  useEffect(() => {
    // Only redirect if we're done loading and there's definitely no user
    if (!authLoading && user === null) {
      router.push('/auth/signin')
    }
  }, [user, authLoading, router])

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || '',
      })
    }
  }, [user, reset])

  // Handle tab and bookingId from URL parameters
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const bookingIdParam = searchParams.get('bookingId')
    
    if (tabParam && ['profile', 'bookings', 'reviews', 'payments', 'listings'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
    
    // If bookingId is in URL, expand that booking
    if (bookingIdParam) {
      setExpandedBookingId(bookingIdParam)
      // Ensure bookings tab is active
      if (tabParam !== 'bookings') {
        setActiveTab('bookings')
      }
    }
  }, [searchParams])

  // Fetch bookings when bookings tab is active
  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      fetchBookings()
    }
  }, [activeTab, user])

  // Fetch notifications when notifications tab is active (only once per tab switch)
  useEffect(() => {
    // Fetch notifications when profile tab is active (notifications are now in Profile tab)
    if (activeTab === 'profile' && user?.id && !hasFetchedNotifications) {
      fetchNotifications()
      setHasFetchedNotifications(true)
    } else if (activeTab !== 'profile') {
      // Reset flag when switching away from profile tab
      setHasFetchedNotifications(false)
    }
  }, [activeTab, user?.id, hasFetchedNotifications])

  // Fetch reviews when reviews tab is active
  useEffect(() => {
    if (activeTab === 'reviews' && user) {
      fetchReviews()
    }
  }, [activeTab, user])

  // Auto-expand booking when bookingId is in URL and bookings are loaded
  useEffect(() => {
    const bookingIdParam = searchParams.get('bookingId')
    if (bookingIdParam && bookings.length > 0 && !expandedBookingId) {
      // Check if the booking exists in the loaded bookings
      const bookingExists = bookings.some((b: any) => b.id === bookingIdParam)
      if (bookingExists) {
        setExpandedBookingId(bookingIdParam)
        // Scroll to the booking after a short delay to ensure it's rendered
        setTimeout(() => {
          const element = document.getElementById(`booking-${bookingIdParam}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [bookings, searchParams, expandedBookingId])

  const fetchBookings = async () => {
    try {
      setIsLoadingBookings(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.log('No auth token found, skipping bookings fetch')
        return
      }

      // Fetch bookings as both renter and host
      // The backend requires a role parameter, so we fetch both separately
      const [renterResponse, hostResponse] = await Promise.all([
        apiService.getUserBookings('renter'),
        apiService.getUserBookings('host'),
      ])

      const renterBookings = renterResponse.success && renterResponse.data?.bookings 
        ? renterResponse.data.bookings 
        : []
      const hostBookings = hostResponse.success && hostResponse.data?.bookings 
        ? hostResponse.data.bookings 
        : []

      setBookings(renterBookings)
      setHostBookings(hostBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
      setHostBookings([])
    } finally {
      setIsLoadingBookings(false)
    }
  }

  const fetchNotifications = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingNotifications) return
    
    try {
      setIsLoadingNotifications(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.log('No auth token found, skipping notifications fetch')
        return
      }

      const response = await apiService.getNotifications()
      if (response.success && response.data) {
        // API returns { notifications: [...] }; support both shapes for resilience
        const list = Array.isArray(response.data) ? response.data : (response.data.notifications || [])
        setNotifications(list)
      } else {
        setNotifications([])
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
      // Don't clear notifications on error, keep existing ones
      if (error.message?.includes('429')) {
        // Rate limited - don't retry immediately
        console.warn('Rate limited, skipping notification fetch')
      } else {
        setNotifications([])
      }
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  // Memoize filtered notifications to prevent flashing
  const filteredNotifications = useMemo(() => {
    return notificationTab === 'inbox'
      ? notifications.filter((n: any) => !n.is_read)
      : notifications.filter((n: any) => n.is_read)
  }, [notifications, notificationTab])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId)
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleReviewReminderClick = (notification: any) => {
    const data = notification.data || {}
    setSelectedReviewBooking({
      bookingId: data.booking_id || data.bookingId,
      propertyTitle: data.property_title || data.propertyTitle,
      reviewedUserName: notification.message?.includes('host') ? 'the host' : 'the renter',
    })
    setShowReviewModal(true)
    handleMarkAsRead(notification.id)
  }

  // Generate navigation URL based on notification type and data
  const getNotificationUrl = (notification: any): string | null => {
    const data = notification.data || {}
    const bookingId = data.booking_id || data.bookingId
    const messageId = data.message_id || data.messageId
    const propertyId = data.property_id || data.propertyId

    switch (notification.type) {
      case 'review_reminder':
        // Navigate to bookings tab and expand the booking
        return bookingId ? `/profile?tab=bookings&bookingId=${bookingId}` : null
      
      case 'message_received':
        // Navigate to bookings tab, expand booking, and open messages
        return bookingId ? `/profile?tab=bookings&bookingId=${bookingId}` : null
      
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
        // Navigate to bookings tab and expand the booking
        return bookingId ? `/profile?tab=bookings&bookingId=${bookingId}` : null
      
      case 'payment_received':
        // Navigate to payments tab or bookings tab
        return bookingId ? `/profile?tab=bookings&bookingId=${bookingId}` : `/profile?tab=payments`
      
      case 'review_received':
        // Navigate to reviews tab
        return `/profile?tab=reviews`
      
      default:
        return null
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    // Handle special cases
    if (notification.type === 'review_reminder' && !notification.has_reviewed) {
      handleReviewReminderClick(notification)
      return
    }

    if (notification.type === 'message_received') {
      const data = notification.data || {}
      const bookingId = data.booking_id || data.bookingId
      if (bookingId) {
        setActiveTab('bookings')
        // Small delay to ensure tab is active, then open messages
        setTimeout(() => {
          setSelectedBookingForMessages(bookingId)
          setExpandedBookingId(bookingId)
          setShowMessagesModal(true)
        }, 200)
        return
      }
    }

    // Navigate to the appropriate section
    const url = getNotificationUrl(notification)
    if (url) {
      router.push(url)
    }
  }

  const fetchReviews = async () => {
    try {
      setIsLoadingReviews(true)
      if (!user?.id) return

      // Reviews API endpoint not yet implemented
      // TODO: Add getUserReviews to apiService when backend endpoint is ready
      setReviews([])
    } catch (error) {
      console.error('Error fetching reviews:', error)
      setReviews([])
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // Resize image to max dimensions while maintaining aspect ratio
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob'))
              }
            },
            file.type,
            0.9 // Quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        } 
      })
      setWebcamStream(stream)
      setShowWebcam(true)
    } catch (error: any) {
      console.error('Error accessing webcam:', error)
      toast.error('Could not access webcam. Please check permissions.')
    }
  }

  // Assign stream to video element when both are available
  useEffect(() => {
    if (showWebcam && webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream
      // Ensure video plays
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error)
      })
    }
  }, [showWebcam, webcamStream])

  // Stop webcam
  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop())
      setWebcamStream(null)
    }
    setShowWebcam(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Capture photo from webcam
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'webcam-photo.jpg', { type: 'image/jpeg' })
        setSelectedAvatarFile(file)
        
        // Show preview
        const reader = new FileReader()
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        
        // Stop webcam
        stopWebcam()
      }
    }, 'image/jpeg', 0.9)
  }

  // Cleanup webcam on unmount or modal close
  useEffect(() => {
    return () => {
      stopWebcam()
    }
  }, [])

  useEffect(() => {
    if (!showAvatarModal) {
      stopWebcam()
    }
  }, [showAvatarModal])

  const handleAvatarFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Store file for upload
      setSelectedAvatarFile(file)
    } catch (error: any) {
      console.error('Error processing avatar:', error)
      toast.error(error.message || 'Failed to process image')
      setAvatarPreview(null)
      setSelectedAvatarFile(null)
    } finally {
      // Reset file input
      event.target.value = ''
    }
  }

  const uploadAvatar = async (file?: File) => {
    const fileToUpload = file || selectedAvatarFile
    if (!fileToUpload) {
      toast.error('Please select an image first')
      return
    }
    try {
      setIsUploadingAvatar(true)
      
      // Resize image to max 800x800 for avatars
      const resizedBlob = await resizeImage(fileToUpload, 800, 800)
      const resizedFile = new File([resizedBlob], fileToUpload.name, { type: fileToUpload.type })
      
      // TODO: Implement avatar upload endpoint
      // For now, create a data URL and update profile directly
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        if (!base64String) {
          throw new Error('Failed to read image file')
        }
        try {
          const updateResponse = await updateProfile({ avatar: base64String })
          if (updateResponse) {
            toast.success('Profile picture updated successfully!')
            setShowAvatarModal(false)
            setAvatarPreview(null)
            setSelectedAvatarFile(null)
            // Refresh user data to ensure UI updates
            await refreshUser()
          } else {
            // If updateProfile fails, still refresh to get the avatar from the database
            await refreshUser()
            toast.success('Profile picture uploaded successfully!')
            setShowAvatarModal(false)
            setAvatarPreview(null)
            setSelectedAvatarFile(null)
          }
        } catch (updateError: any) {
          // If updateProfile fails, still refresh to get the avatar from the database
          console.error('Profile update error (non-fatal):', updateError)
          await refreshUser()
          toast.success('Profile picture uploaded successfully!')
          setShowAvatarModal(false)
          setAvatarPreview(null)
          setSelectedAvatarFile(null)
        }
      }
      reader.onerror = () => {
        throw new Error('Failed to read image file')
      }
      reader.readAsDataURL(resizedFile)
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error(error.message || 'Failed to upload profile picture')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Fetch user's properties function - memoized with useCallback
  const fetchUserProperties = useCallback(async () => {
    try {
      // Check if token exists before making API call
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found, skipping API call');
        return;
      }
      
      setIsLoadingListings(true);
      const response = await apiService.getUserProperties();
      if (response.success && response.data) {
        setListings(response.data.properties || []);
      } else {
        // Handle empty listings gracefully
        setListings([]);
      }
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      
      // Show different messages based on error type
      if (error.message?.includes('Invalid token')) {
        toast.error('Authentication expired. Please sign in again.');
      } else if (error.message?.includes('401')) {
        toast.error('Authentication failed. Please sign in again.');
      } else {
        toast.error('Failed to load your listings');
      }
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  // Fetch user's properties on component mount (only once per user)
  const [hasFetchedProperties, setHasFetchedProperties] = useState(false);
  useEffect(() => {
    if (user?.id && !hasFetchedProperties) {
      // Check if we have a valid token before trying to fetch
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Add a small delay to ensure token is fully available
        const timer = setTimeout(() => {
          fetchUserProperties();
          setHasFetchedProperties(true);
        }, 100);
        
        return () => clearTimeout(timer);
      }
    } else if (!user?.id) {
      // Reset flag when user logs out
      setHasFetchedProperties(false);
    }
  }, [user?.id, hasFetchedProperties, fetchUserProperties]);

  // Check Stripe Connect status (only once when user is available)
  useEffect(() => {
    let isMounted = true;
    const checkStripeStatus = async () => {
      if (user && isMounted) {
        try {
          const response = await apiService.getConnectAccountStatus();
          if (isMounted && response.success && response.data) {
            setStripeConnected(response.data.connected);
            setStripeStatus(response.data.status || 'pending');
            setStripeNeedsVerification(response.data.needsVerification || false);
            setStripeVerificationUrl(response.data.verificationUrl || null);
          }
        } catch (error) {
          console.error('Error checking Stripe status:', error);
        }
      }
    };
    checkStripeStatus();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Fetch host earnings when on Payments tab (so pendingEarnings and revenue dashboard are correct)
  useEffect(() => {
    let isMounted = true;
    const fetchEarnings = async () => {
      if (!user?.id || activeTab !== 'payments') return;
      setIsLoadingEarnings(true);
      try {
        const response = await apiService.getHostEarnings();
        if (isMounted && response.success && response.data) {
          setHostEarnings(response.data);
          setPendingEarnings(response.data.netEarnings);
        } else if (isMounted) {
          setHostEarnings(null);
          setPendingEarnings(0);
        }
      } catch {
        if (isMounted) {
          setHostEarnings(null);
          setPendingEarnings(0);
        }
      } finally {
        if (isMounted) setIsLoadingEarnings(false);
      }
    };
    fetchEarnings();
    return () => { isMounted = false; };
  }, [user?.id, activeTab]);

  // Handle Stripe Connect onboarding (delayed - only when earnings exist)
  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      // Use connect account creation endpoint
      const response = await apiService.createConnectAccount();
      if (response.success && response.data?.url) {
        // Show earnings amount in toast if available
        // Note: needsEarnings and pendingEarnings not in current API response
        // Redirect to Stripe onboarding
        window.location.href = response.data.url;
      } else {
        // If no URL, show error
        toast.error(response.error || 'Failed to start payout setup');
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      // Check if error is about no earnings
      if (error.message?.includes('No earnings available') || error.response?.data?.error?.includes('No earnings')) {
        toast('Complete your first booking to set up payouts', {
          icon: 'ℹ️',
          duration: 4000,
        });
      } else {
        toast.error(error.message || 'Failed to connect payout account');
      }
    } finally {
      setIsConnectingStripe(false);
    }
  };

  // Check for Stripe return from URL params
  useEffect(() => {
    const stripeSuccess = searchParams.get('stripe_success');
    const stripeRefresh = searchParams.get('stripe_refresh');
    
    if (stripeSuccess === 'true') {
      toast.success('Stripe account connected successfully!');
      // Refresh status after a short delay to ensure Stripe has processed
      setTimeout(() => {
        apiService.getConnectAccountStatus().then(response => {
          console.log('[Profile] Status refresh after return:', response);
          if (response.success && response.data) {
            setStripeConnected(response.data.connected);
            setStripeStatus(response.data.status || 'pending');
            setStripeNeedsVerification(response.data.needsVerification || false);
            setStripeVerificationUrl(response.data.verificationUrl || null);
            // pendingEarnings not available in current API response
            setPendingEarnings(0);
          }
        }).catch(error => {
          console.error('[Profile] Error refreshing status:', error);
        });
      }, 1000);
      // Clean URL
      router.replace('/profile?tab=payments', { scroll: false });
    } else if (stripeRefresh === 'true') {
      // User needs to complete onboarding
      toast('Please complete your Stripe account setup', { icon: 'ℹ️' });
      router.replace('/profile?tab=payments', { scroll: false });
    }
  }, [searchParams, router]);

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true)
    try {
      const ok = await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      })
      if (ok) {
        await refreshUser()
        setIsEditing(false)
        toast.success('Profile updated successfully!')
      } else {
        toast.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || '',
      })
    }
    setIsEditing(false)
  }

  const handleLogout = () => {
    logout()
    toast.success('Successfully logged out')
    router.push('/')
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'bookings', label: 'My Bookings', icon: Calendar },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'listings', label: 'My Listings', icon: Car },
  ]

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }


  const handleEditListing = (listing: any) => {
    // Set the listing to edit and populate the form
    setEditingListing(listing);
    setExistingPhotos(listing.photos || []);
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setListingFormData({
      title: listing.title || '',
      address: listing.address || '',
      price: listing.hourly_rate?.toString() || listing.price?.toString() || '',
      description: listing.description || '',
      coordinates: listing.latitude && listing.longitude ? [listing.latitude, listing.longitude] : null,
      city: listing.city || '',
      state: listing.state || '',
      zipCode: listing.zip_code || '',
      propertyType: listing.property_type || 'driveway',
      features: listing.features || [],
      requireApproval: listing.require_approval === true,
      leadTimeHours: listing.lead_time_hours ?? 0,
      availability: {
        monday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.monday_available !== false 
        },
        tuesday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.tuesday_available !== false 
        },
        wednesday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.wednesday_available !== false 
        },
        thursday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.thursday_available !== false 
        },
        friday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.friday_available !== false 
        },
        saturday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.saturday_available !== false 
        },
        sunday: { 
          start: listing.start_time || '09:00', 
          end: listing.end_time || '17:00', 
          available: listing.sunday_available !== false 
        }
      }
    });
    setShowAddListingModal(true);
  };

  const handleDeleteClick = (listingId: string) => {
    setDeletingListingId(listingId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteListing = async () => {
    if (!deletingListingId) return;

    try {
      const response = await apiService.deleteProperty(deletingListingId);
      if (response.success) {
        toast.success('Listing deleted successfully');
        // Remove from list
        setListings(prev => prev.filter(l => l.id !== deletingListingId));
        setShowDeleteConfirm(false);
        setDeletingListingId(null);
      } else {
        throw new Error(response.error || 'Failed to delete listing');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      toast.error(error.message || 'Failed to delete listing');
    }
  };

  const uploadPhotos = async (propertyId: string, files: File[]): Promise<{ uploadedUrls: string[]; failedCount: number }> => {
    const uploadedUrls: string[] = [];
    let failedCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('propertyId', propertyId);

        const token = localStorage.getItem('auth_token');
        const apiBase = (() => {
          const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          return url.endsWith('/api') ? url.replace(/\/$/, '') : url.replace(/\/$/, '') + '/api';
        })();
        const response = await fetch(`${apiBase}/properties/${propertyId}/photos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = 'Failed to upload photo';
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
          } catch (e) {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success && data.data?.url) {
          uploadedUrls.push(data.data.url);
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error(`Failed to upload ${file.name}`);
        failedCount += 1;
      }
    }

    return { uploadedUrls, failedCount };
  };

  const handleSubmitListing = async (listingData: any) => {
    try {
      setIsSubmittingListing(true);

      // If address is set but no coordinates (e.g. user typed address without selecting), geocode for accurate pin
      let coordinates = listingData.coordinates;
      if (listingData.address?.trim() && !coordinates?.length) {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const queryParts = [
          listingData.address,
          listingData.city,
          listingData.state,
          listingData.zip_code,
        ]
          .filter(Boolean)
          .map((s: string) => String(s).trim());
        if (token && queryParts.length > 0) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                queryParts.join(', ')
              )}.json?access_token=${token}&limit=1&types=address,place`
            );
            const data = await res.json();
            if (data?.features?.length && data.features[0].center?.length >= 2) {
              coordinates = data.features[0].center; // [longitude, latitude]
            }
          } catch (_) {
            // Continue without coordinates; backend will store null
          }
        }
      }

      // Pick canonical start/end from first available day (DB has one pair for all days)
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
      const firstAvailable = daysOrder.find((d) => listingData.availability[d]?.available);
      const startTime = firstAvailable
        ? listingData.availability[firstAvailable].start
        : '00:00';
      const endTime = firstAvailable
        ? listingData.availability[firstAvailable].end
        : '23:59';

      // Prepare data for backend
      const propertyData = {
        title: listingData.title,
        description: listingData.description || '',
        address: listingData.address,
        city: listingData.city || '',
        state: listingData.state || '',
        zip_code: listingData.zip_code || '',
        price: listingData.price, // Backend expects 'price' not 'hourly_rate'
        property_type: listingData.property_type || 'driveway',
        max_vehicles: 1,
        require_approval: listingData.require_approval === true,
        lead_time_hours: Number(listingData.lead_time_hours) || 0,
        instant_booking: listingData.require_approval ? false : true,
        coordinates, // From autocomplete selection or geocode above
        // Availability hours (so Find Parking shows correct times)
        start_time: startTime,
        end_time: endTime,
        monday_available: listingData.availability.monday.available,
        tuesday_available: listingData.availability.tuesday.available,
        wednesday_available: listingData.availability.wednesday.available,
        thursday_available: listingData.availability.thursday.available,
        friday_available: listingData.availability.friday.available,
        saturday_available: listingData.availability.saturday.available,
        sunday_available: listingData.availability.sunday.available,
      };

      let response;
      let propertyId: string | undefined;
      
      if (editingListing) {
        // Update existing listing
        propertyId = editingListing.id;
        if (!propertyId) {
          toast.error('Invalid listing ID');
          return;
        }
        response = await apiService.updateProperty(propertyId, propertyData);
        if (response.success) {
          toast.success('Listing updated successfully!');
        }
      } else {
        // Create new listing
        response = await apiService.createProperty(propertyData);
        if (response.success) {
          propertyId = response.data?.property?.id;
          toast.success('Listing created successfully!');
          
          // Refresh user data to get updated is_host status
          setTimeout(async () => {
            try {
              const userResponse = await apiService.getMe();
              if (userResponse.data?.user) {
                updateProfile(userResponse.data.user);
              }
            } catch (error) {
              console.error('Failed to refresh user data:', error);
            }
          }, 500);
        }
      }
      
      if (response.success && propertyId && typeof propertyId === 'string') {
        // Upload photos if any were selected
        if (selectedPhotos.length > 0) {
          toast.loading('Uploading photos...', { id: 'photo-upload' });
          const { uploadedUrls, failedCount } = await uploadPhotos(propertyId, selectedPhotos);
          if (failedCount === 0) {
            toast.success('Photos uploaded successfully!', { id: 'photo-upload' });
          } else if (uploadedUrls.length > 0) {
            toast.error(`${failedCount} of ${selectedPhotos.length} photo(s) failed to upload.`, { id: 'photo-upload' });
          } else {
            toast.error('All photos failed to upload. Please try again.', { id: 'photo-upload' });
          }
        }
        
        setShowAddListingModal(false);
        setEditingListing(null);
        setSelectedPhotos([]);
        setPhotoPreviews([]);
        setExistingPhotos([]);
        
        // Reset form data
        setListingFormData({
          title: '',
          address: '',
          price: '',
          description: '',
          coordinates: null,
          city: '',
          state: '',
          zipCode: '',
          propertyType: 'driveway',
          features: [],
          requireApproval: false,
          leadTimeHours: 0,
          availability: {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '17:00', available: true },
            sunday: { start: '09:00', end: '17:00', available: true }
          }
        });
        
        // Refresh the listings
        await fetchUserProperties();
      } else {
        throw new Error(response.error || `Failed to ${editingListing ? 'update' : 'create'} listing`);
      }
    } catch (error: any) {
      console.error(`Error ${editingListing ? 'updating' : 'adding'} listing:`, error);
      toast.error(error.message || `Failed to ${editingListing ? 'update' : 'add'} listing`);
    } finally {
      setIsSubmittingListing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24 lg:pb-10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-white/30 sticky top-16 md:top-20 z-20">
        <div className="max-w-7xl mx-auto container-padding py-3 sm:py-4 lg:py-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">My Profile</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto container-padding py-4 sm:py-6 lg:py-8">
        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            {/* User Info - Mobile */}
            <div className="flex flex-col items-center mb-4 pb-4 border-b border-mist-200">
              {!user ? (
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <button 
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute bottom-0 right-0 bg-accent-500 text-white rounded-full p-1 hover:bg-accent-600 transition-all shadow-md border-2 border-white touch-target w-5 h-5 flex items-center justify-center"
                      title="Change profile picture"
                    >
                      <Camera className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="text-center">
                    <h2 className="text-base font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <div className="flex items-center justify-center mt-0.5">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="ml-1 text-xs text-gray-600">{user?.rating || 0}</span>
                      <span className="ml-1 text-xs text-gray-500">({user?.reviewCount || 0})</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              {/* User Info */}
              <div className="text-center mb-6">
                {!user ? (
                  <div className="animate-pulse">
                    <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="relative inline-block">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                          <User className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <button 
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute bottom-2 right-2 bg-accent-500 text-white rounded-full p-2 hover:bg-accent-600 transition-colors shadow-lg border-2 border-white"
                        title="Change profile picture"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <p className="text-gray-600 text-sm">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</p>
                    <div className="flex items-center justify-center mt-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">{user?.rating || 0}</span>
                      <span className="ml-1 text-sm text-gray-500">({user?.reviewCount || 0} reviews)</span>
                    </div>
                    {activeTab === 'profile' && (
                      <div className="mt-4">
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm text-accent-700 border border-accent-300/60 rounded-lg hover:bg-accent-500/10 backdrop-blur-sm transition-all min-h-[44px]"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Profile
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-700 border border-mist-300 rounded-lg hover:bg-mist-100 min-h-[44px]"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmit(onSubmit)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-white bg-accent-500 rounded-lg hover:bg-accent-600 disabled:opacity-50 min-h-[44px]"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Bookings</span>
                  <span className="font-medium">{(user as any)?.total_bookings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="font-medium">${(user as any)?.total_earnings || 0}</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-gray-600 hover:bg-mist-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>

              {/* Logout */}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mt-6"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-mist-200 p-4 sm:p-6">
                {/* Complete your profile banner - show when key fields missing, dismissible */}
                <ProfileCompleteBanner user={user} onEditProfile={() => setIsEditing(true)} />

                <div className="mb-5 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Personal Information</h2>
                </div>

                {/* Mobile Edit Button */}
                <div className="lg:hidden mb-6">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center px-4 py-2.5 text-sm text-accent-700 border border-accent-300/60 rounded-lg hover:bg-accent-500/10 backdrop-blur-sm transition-all min-h-[44px]"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm text-gray-700 border border-mist-300 rounded-lg hover:bg-mist-100 min-h-[44px]"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm text-white bg-accent-500 rounded-lg hover:bg-accent-600 disabled:opacity-50 min-h-[44px]"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        {...register('firstName')}
                        type="text"
                        disabled={!isEditing}
                        className="input disabled:bg-gray-50"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        {...register('lastName')}
                        type="text"
                        disabled={!isEditing}
                        className="input disabled:bg-gray-50"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      disabled={!isEditing}
                      className="input disabled:bg-gray-50"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      disabled={!isEditing}
                      className="input disabled:bg-gray-50"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      {isEditing ? (
                        <MapboxAutocomplete
                          value={watch('address') || ''}
                          onChange={(value) => setValue('address', value)}
                          onSelect={(place) => {
                            setValue('address', place.place_name);
                            // Extract city, state, zip, country from place context
                            const city = place.context?.find(ctx => ctx.id.includes('place'))?.text || '';
                            const state = place.context?.find(ctx => ctx.id.includes('region'))?.text || '';
                            const zipCode = place.context?.find(ctx => ctx.id.includes('postcode'))?.text || '';
                            const countryCode = place.context?.find(ctx => ctx.id.includes('country'))?.country_code?.toUpperCase() || '';
                            setValue('city', city);
                            setValue('state', state);
                            setValue('zipCode', zipCode);
                            if (countryCode) setValue('country', countryCode);
                          }}
                          placeholder="e.g. 1234 Barrington St, Halifax, NS"
                          className="w-full"
                        />
                      ) : (
                        <input
                          {...register('address')}
                          type="text"
                          disabled
                          className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        {...register('city')}
                        type="text"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        {...register('state')}
                        type="text"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal/Zip Code
                      </label>
                      <input
                        {...register('zipCode')}
                        type="text"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                        <p className="text-sm text-gray-900">{watch('firstName') || user?.firstName || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                        <p className="text-sm text-gray-900">{watch('lastName') || user?.lastName || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                      <p className="text-sm text-gray-900">{watch('email') || user?.email || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                      <p className="text-sm text-gray-900">{watch('phone') || user?.phone || '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                        <p className="text-sm text-gray-900">{watch('address') || user?.address || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                        <p className="text-sm text-gray-900">{watch('city') || user?.city || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Province/State</label>
                        <p className="text-sm text-gray-900">{watch('state') || user?.state || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                        <p className="text-sm text-gray-900">
                          {COUNTRY_OPTIONS.find(o => o.value === (watch('country') || user?.country))?.label || watch('country') || user?.country || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Postal/Zip Code</label>
                        <p className="text-sm text-gray-900">{watch('zipCode') || user?.zipCode || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                      <Bell className="h-5 w-5 mr-2 text-accent-500" />
                      Notifications
                    </h2>
                    {notificationTab === 'inbox' && notifications.filter((n: any) => !n.is_read).length > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await Promise.all(
                              notifications
                                .filter((n: any) => !n.is_read)
                                .map((n: any) => apiService.markNotificationAsRead(n.id))
                            )
                            setNotifications(notifications.map((n: any) => ({ ...n, is_read: true })))
                            toast.success('All notifications marked as read')
                          } catch (error) {
                            console.error('Error marking all as read:', error)
                          }
                        }}
                        className="text-sm text-accent-600 hover:text-accent-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification Tabs */}
                  <div className="mb-6 border-b border-gray-200">
                    <nav className="flex space-x-8">
                      <button
                        onClick={() => setNotificationTab('inbox')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          notificationTab === 'inbox'
                            ? 'border-accent-500 text-accent-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Inbox
                        {notifications.filter((n: any) => !n.is_read).length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-accent-500 text-white text-xs rounded-full">
                            {notifications.filter((n: any) => !n.is_read).length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setNotificationTab('history')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          notificationTab === 'history'
                            ? 'border-accent-500 text-accent-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        History
                        {notifications.filter((n: any) => n.is_read).length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">
                            {notifications.filter((n: any) => n.is_read).length}
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>
                  {isLoadingNotifications && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
                      <span className="ml-3 text-gray-600">Loading notifications...</span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        {notificationTab === 'inbox' ? 'No unread notifications' : 'No notification history'}
                      </p>
                      <p className="text-sm text-gray-500">You'll see notifications here when you receive them</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredNotifications.map((notification: any) => {
                        const isUnread = !notification.is_read
                        const isReviewReminder = notification.type === 'review_reminder'
                        const hasReviewed = notification.has_reviewed || notification.title === 'Review Left'
                        
                        const hasAction = getNotificationUrl(notification) !== null || 
                                         (isReviewReminder && !hasReviewed)

                        return (
                          <div
                            key={notification.id}
                            onClick={() => hasAction && handleNotificationClick(notification)}
                            className={`border rounded-lg p-4 transition-colors ${
                              isUnread
                                ? 'border-accent-200 bg-accent-50'
                                : 'border-gray-200 bg-white'
                            } ${
                              hasAction ? 'cursor-pointer hover:shadow-md hover:border-accent-300' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                  {isUnread && (
                                    <span className="h-2 w-2 bg-accent-500 rounded-full"></span>
                                  )}
                                  {hasAction && (
                                    <span className="text-xs text-accent-600 ml-auto">Click to view →</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(notification.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                {isReviewReminder && !hasReviewed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleReviewReminderClick(notification)
                                    }}
                                    className="mt-3 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                                  >
                                    Leave Review
                                  </button>
                                )}
                                {isReviewReminder && hasReviewed && (
                                  <div className="mt-3 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                                    <span>✓</span>
                                    <span>Review Left</span>
                                  </div>
                                )}
                              </div>
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsRead(notification.id)
                                  }}
                                  className="ml-4 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Verification Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-accent-500" />
                    Verification Status
                  </h2>
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Verification system is currently being updated</p>
                  </div>
                </div>

                {/* Settings Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-accent-500" />
                    Account Settings
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">Email notifications for new bookings</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">SMS notifications for urgent messages</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded" />
                          <span className="ml-2 text-sm text-gray-700">Marketing emails and promotions</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">Show my profile to other users</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded" />
                          <span className="ml-2 text-sm text-gray-700">Allow reviews and ratings</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Bookings</h2>
                  {(bookings.length > 0 || hostBookings.length > 0) && (
                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 scrollbar-hide">
                      <button
                        onClick={() => setBookingView('all')}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center touch-target ${
                          bookingView === 'all'
                            ? 'bg-accent-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                        }`}
                      >
                        All ({bookings.length + hostBookings.length})
                      </button>
                      {bookings.length > 0 && (
                        <button
                          onClick={() => setBookingView('renter')}
                          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center touch-target ${
                            bookingView === 'renter'
                              ? 'bg-accent-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                        >
                          <span className="hidden sm:inline">My Bookings</span>
                          <span className="sm:hidden">Bookings</span>
                          <span className="ml-1">({bookings.length})</span>
                        </button>
                      )}
                      {hostBookings.length > 0 && (
                        <button
                          onClick={() => setBookingView('host')}
                          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center touch-target ${
                            bookingView === 'host'
                              ? 'bg-accent-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                        >
                          <span className="hidden sm:inline">At My Listings</span>
                          <span className="sm:hidden">Listings</span>
                          <span className="ml-1">({hostBookings.length})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isLoadingBookings ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
                    <span className="ml-3 text-gray-600">Loading bookings...</span>
                  </div>
                ) : (() => {
                  const displayBookings = bookingView === 'all' 
                    ? [...bookings, ...hostBookings].sort((a, b) => 
                        new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime()
                      )
                    : bookingView === 'renter' 
                    ? bookings 
                    : hostBookings;

                  if (displayBookings.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          {bookingView === 'renter' 
                            ? 'No bookings yet' 
                            : bookingView === 'host'
                            ? 'No bookings at your listings yet'
                            : 'No bookings found'}
                        </p>
                        {bookingView === 'renter' && (
                          <>
                            <p className="text-sm text-gray-500 mb-6">Start by booking a parking space!</p>
                            <Link
                              href="/find-parking"
                              className="inline-flex items-center px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-semibold"
                            >
                              Find Parking
                            </Link>
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {displayBookings.map((booking) => {
                      const property = booking.property || {}
                      const startDate = booking.start_time ? new Date(booking.start_time) : null
                      const endDate = booking.end_time ? new Date(booking.end_time) : null
                      const coverPhoto = property.photos?.[0] 
                        ? (typeof property.photos[0] === 'string' ? property.photos[0] : property.photos[0]?.url)
                        : null

                      const isExpanded = expandedBookingId === booking.id
                      const isHostView = user?.id === booking.host_id
                      const otherUser = isHostView ? booking.renter : booking.host
                      const otherUserInfo = otherUser || {}
                      
                      return (
                        <div id={`booking-${booking.id}`} key={booking.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                          <div className="flex flex-col sm:flex-row">
                            {coverPhoto && (
                              <div className="w-full h-48 sm:w-32 sm:h-32 md:w-40 md:h-40 flex-shrink-0">
                                <img
                                  src={coverPhoto}
                                  alt={property.title || 'Property'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 p-4 sm:p-5">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 break-words">{property.title || 'Parking Space'}</h3>
                                    {isHostView && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0">
                                        At My Listing
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 text-sm sm:text-base mt-1.5 break-words leading-relaxed">{property.address || 'Address not available'}</p>
                                  {otherUserInfo.first_name && (
                                    <p className="text-gray-500 text-sm mt-2 sm:mt-1.5">
                                      <span className="font-medium">{isHostView ? 'Booked by' : 'Host'}:</span> {otherUserInfo.first_name} {otherUserInfo.last_name}
                                    </p>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center mt-3 sm:mt-4 gap-2 sm:gap-3 sm:gap-4 text-sm text-gray-600">
                                    {startDate && (
                                      <span className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-1.5 flex-shrink-0 text-gray-400" />
                                        <span className="whitespace-nowrap font-medium">{startDate.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}</span>
                                      </span>
                                    )}
                                    {startDate && endDate && (
                                      <span className="flex items-center">
                                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0 text-gray-400" />
                                        <span className="whitespace-nowrap">{startDate.toLocaleTimeString('en-US', { 
                                          hour: 'numeric', 
                                          minute: '2-digit',
                                          hour12: true 
                                        })} - {endDate.toLocaleTimeString('en-US', { 
                                          hour: 'numeric', 
                                          minute: '2-digit',
                                          hour12: true 
                                        })}</span>
                                      </span>
                                    )}
                                    {booking.total_hours && (
                                      <span className="whitespace-nowrap text-gray-500">• {booking.total_hours} {booking.total_hours === 1 ? 'hour' : 'hours'}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right sm:ml-4 gap-3 sm:gap-2 mt-2 sm:mt-0">
                                  {booking.total_amount && (
                                    <p className="font-bold text-xl sm:text-lg text-gray-900">${booking.total_amount.toFixed(2)}</p>
                                  )}
                                  <span className={`inline-block px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap ${
                                    booking.status === 'confirmed' 
                                      ? 'bg-green-100 text-green-800' 
                                      : booking.status === 'completed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : booking.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {booking.status === 'confirmed' ? 'Confirmed' :
                                     booking.status === 'completed' ? 'Completed' :
                                     booking.status === 'cancelled' ? 'Cancelled' :
                                     booking.status === 'pending' ? 'Pending' :
                                     booking.status || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                                {(booking.status === 'confirmed' || booking.status === 'completed') && (
                                  <button
                                    onClick={() => {
                                      setSelectedBookingForMessages(booking.id)
                                      setShowMessagesModal(true)
                                    }}
                                    className="flex items-center justify-center px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 active:bg-accent-700 transition-colors text-sm font-medium min-h-[44px] touch-target shadow-sm"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                    <span>Message {isHostView ? 'Guest' : 'Host'}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                                  className="flex items-center justify-center text-sm text-accent-600 hover:text-accent-700 active:text-accent-800 font-medium min-h-[44px] px-3 py-2 touch-target"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                      <span>Hide Details</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                      <span>View Details</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 sm:space-y-5">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-2">Booking Information</h4>
                                      <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center">
                                          <span className="text-gray-500 font-medium sm:font-normal mb-0.5 sm:mb-0">Booking ID:</span>
                                          <span className="ml-0 sm:ml-2 font-mono text-gray-900 break-all sm:break-normal">{booking.id}</span>
                                        </div>
                                        {startDate && (
                                          <div className="flex flex-col sm:flex-row sm:items-start">
                                            <span className="text-gray-500 font-medium sm:font-normal mb-0.5 sm:mb-0">Start:</span>
                                            <span className="ml-0 sm:ml-2 text-gray-900 break-words">
                                              {startDate.toLocaleString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                          </div>
                                        )}
                                        {endDate && (
                                          <div className="flex flex-col sm:flex-row sm:items-start">
                                            <span className="text-gray-500 font-medium sm:font-normal mb-0.5 sm:mb-0">End:</span>
                                            <span className="ml-0 sm:ml-2 text-gray-900 break-words">
                                              {endDate.toLocaleString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                          </div>
                                        )}
                                        {booking.total_hours && (
                                          <div className="flex flex-col sm:flex-row sm:items-center">
                                            <span className="text-gray-500 font-medium sm:font-normal mb-0.5 sm:mb-0">Duration:</span>
                                            <span className="ml-0 sm:ml-2 text-gray-900">
                                              {booking.total_hours} {booking.total_hours === 1 ? 'hour' : 'hours'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-2">Payment Details</h4>
                                      <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        {booking.total_amount && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium sm:font-normal">Total Amount:</span>
                                            <span className="font-bold text-lg sm:text-base text-gray-900">${booking.total_amount.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {booking.service_fee && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-medium sm:font-normal">Service Fee:</span>
                                            <span className="text-gray-900">${booking.service_fee.toFixed(2)}</span>
                                          </div>
                                        )}
                                        {booking.payment_status && (
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                            <span className="text-gray-500 font-medium sm:font-normal">Payment Status:</span>
                                            <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                                              booking.payment_status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : booking.payment_status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                              {booking.payment_status}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {booking.vehicle_info && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Vehicle Information</h4>
                                      <p className="text-sm text-gray-900">
                                        {typeof booking.vehicle_info === 'string' 
                                          ? booking.vehicle_info 
                                          : booking.vehicle_info.note || 'Not specified'}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {booking.special_requests && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Special Requests</h4>
                                      <p className="text-sm text-gray-900">{booking.special_requests}</p>
                                    </div>
                                  )}
                                  
                                  {/* Contact Information */}
                                  {otherUserInfo.first_name && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        {isHostView ? 'Guest Information' : 'Host Information'}
                                      </h4>
                                      <p className="text-sm text-gray-900 mb-3">
                                        {otherUserInfo.first_name} {otherUserInfo.last_name}
                                        {otherUserInfo.email && ` (${otherUserInfo.email})`}
                                        {otherUserInfo.phone && ` - ${otherUserInfo.phone}`}
                                      </p>
                                    </div>
                                  )}

                                  {/* Message Button - Always visible for confirmed/completed bookings */}
                                  {(booking.status === 'confirmed' || booking.status === 'completed') && (
                                    <div className="pt-2 sm:pt-3">
                                      <button
                                        onClick={() => {
                                          setSelectedBookingForMessages(booking.id)
                                          setShowMessagesModal(true)
                                        }}
                                        className="flex items-center justify-center w-full sm:w-auto px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 active:bg-accent-700 transition-colors text-sm font-medium min-h-[44px] touch-target shadow-sm"
                                      >
                                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                                        <span>Message {isHostView ? 'Guest' : 'Host'}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
                {isLoadingReviews ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
                    <span className="ml-3 text-gray-600">Loading reviews...</span>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No reviews yet</p>
                    <p className="text-sm text-gray-500">Reviews from your bookings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review: any) => {
                      const reviewer = review.reviewer || {}
                      const property = review.property || {}
                      const reviewDate = review.created_at ? new Date(review.created_at) : null
                      
                      return (
                        <div key={review.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-full bg-accent-100 flex items-center justify-center">
                                <User className="h-6 w-6 text-accent-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {reviewer.first_name && reviewer.last_name
                                    ? `${reviewer.first_name} ${reviewer.last_name}`
                                    : 'Anonymous'}
                                </h3>
                                {property.title && (
                                  <p className="text-sm text-gray-500">{property.title}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-5 w-5 ${
                                    star <= (review.rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          
                          {review.comment && (
                            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comment}</p>
                          )}
                          
                          {(review.cleanliness || review.communication || review.check_in || review.checkIn || review.accuracy || review.value) && (
                            <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-gray-100">
                              {review.cleanliness && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Cleanliness</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= review.cleanliness
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {review.communication && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Communication</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= review.communication
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(review.check_in || review.checkIn) && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Check-in</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= (review.check_in || review.checkIn || 0)
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {review.accuracy && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Accuracy</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= review.accuracy
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {review.value && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Value</span>
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= review.value
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {reviewDate && (
                            <p className="text-xs text-gray-500">
                              {reviewDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-xl shadow-sm border border-mist-200 p-4 sm:p-6 space-y-8">
                {/* Host revenue dashboard – shows gross, platform fee, net so they expect payout = net */}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-accent-500" />
                    Your revenue
                  </h2>
                  {isLoadingEarnings ? (
                    <div className="rounded-xl border border-mist-200 bg-mist-50/50 p-6 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
                      <span className="ml-3 text-gray-600">Loading earnings…</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-mist-200 bg-mist-50/50 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-mist-200">
                        <div className="p-4 sm:p-5 text-center sm:text-left">
                          <p className="text-sm font-medium text-gray-500">Total from bookings</p>
                          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">
                            ${(hostEarnings?.totalGross ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Amount renters paid (before fees)</p>
                        </div>
                        <div className="p-4 sm:p-5 text-center sm:text-left">
                          <p className="text-sm font-medium text-gray-500">Platform service fee (5%)</p>
                          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">
                            −${(hostEarnings?.totalPlatformFee ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Deducted before payout</p>
                        </div>
                        <div className="p-4 sm:p-5 text-center sm:text-left bg-accent-50/50">
                          <p className="text-sm font-medium text-accent-800">Your earnings (payout)</p>
                          <p className="text-xl sm:text-2xl font-bold text-accent-900 mt-1">
                            ${(hostEarnings?.netEarnings ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-accent-700 mt-1">This is what you receive</p>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-mist-100 border-t border-mist-200">
                        <p className="text-sm text-gray-600">
                          Payouts are the booking total minus the renter’s service fee and our 5% platform fee. You receive <strong>your earnings</strong> above, not the full amount the renter paid.
                        </p>
                      </div>
                      {hostEarnings?.breakdown && hostEarnings.breakdown.length > 0 && (
                        <div className="border-t border-mist-200">
                          <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 bg-white">By booking</h3>
                          <ul className="divide-y divide-mist-200">
                            {hostEarnings.breakdown.map((row) => (
                              <li key={row.bookingId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-white">
                                <div>
                                  <p className="font-medium text-gray-900">{row.propertyTitle}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(row.startTime).toLocaleDateString()} · Renter paid ${row.totalAmount.toFixed(2)} (incl. their fee)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">−${row.platformFee.toFixed(2)} fee</p>
                                  <p className="font-semibold text-accent-700">${row.yourEarnings.toFixed(2)} to you</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment method for reservations */}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-accent-500" />
                    Payment method for reservations
                  </h2>
                  <div className="border border-mist-200 rounded-lg p-4 sm:p-6 bg-mist-50/50">
                    <p className="text-gray-600 text-sm sm:text-base mb-4">
                      Add a card to pay for parking reservations quickly. Your payment method is securely stored and charged when you book a space.
                    </p>
                    <p className="text-gray-500 text-sm">
                      When you complete a booking, you can save your card for future reservations. You can also add or update your payment method at checkout.
                    </p>
                  </div>
                </div>

                {/* Payout Account (for hosts) */}
                <div className="pt-6 border-t border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-5 sm:mb-6 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-accent-500" />
                    Payout account
                  </h2>
                  
                  {!stripeConnected ? (
                    <div className="text-center py-12">
                      {pendingEarnings > 0 ? (
                        <>
                          <CreditCard className="h-12 w-12 text-accent-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            You have ${pendingEarnings.toFixed(2)} ready to withdraw!
                          </h3>
                          <p className="text-gray-600 mb-4 max-w-md mx-auto">
                            Add your payout details to receive your earnings directly to your bank account.
                          </p>
                          <button
                            onClick={handleConnectStripe}
                            disabled={isConnectingStripe}
                            className="w-full sm:w-auto px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
                          >
                            {isConnectingStripe ? 'Setting up...' : 'Add Payout Details'}
                          </button>
                          <p className="text-xs text-gray-500 mt-4">
                            Secure setup takes just a few minutes
                          </p>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-12 w-12 text-accent-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Set up payouts</h3>
                          <p className="text-gray-600 mb-4 max-w-md mx-auto">
                            Add your payout details anytime. When you earn from bookings, funds will go straight to your bank account.
                          </p>
                          <button
                            onClick={handleConnectStripe}
                            disabled={isConnectingStripe}
                            className="w-full sm:w-auto px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
                          >
                            {isConnectingStripe ? 'Setting up...' : 'Add Payout Details'}
                          </button>
                          <p className="text-xs text-gray-500 mt-4">
                            Secure setup takes just a few minutes
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={`border rounded-lg p-4 ${
                        stripeStatus === 'active' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-start">
                          <CheckCircle className={`h-5 w-5 mr-3 mt-0.5 ${
                            stripeStatus === 'active' ? 'text-green-600' : 'text-yellow-600'
                          }`} />
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${
                              stripeStatus === 'active' ? 'text-green-900' : 'text-yellow-900'
                            }`}>
                              {stripeStatus === 'active' 
                                ? 'Stripe Account Connected' 
                                : 'Stripe Account Pending'}
                            </h3>
                            <p className={`text-sm ${
                              stripeStatus === 'active' ? 'text-green-800' : 'text-yellow-800'
                            }`}>
                              {stripeStatus === 'active'
                                ? 'Your account is set up and ready to receive payouts. Earnings will be automatically transferred to your bank account.'
                                : 'Your Stripe account is being set up. Please complete the onboarding process to start receiving payouts.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {stripeStatus === 'pending' && (
                        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                          <p className="text-sm text-accent-800 mb-3">
                            <strong>Action Required:</strong> {
                              stripeNeedsVerification 
                                ? 'Your Stripe account needs identity verification. Please upload the required documents to enable payouts.'
                                : 'Please complete your Stripe account setup to receive payouts.'
                            }
                          </p>
                          <button
                            onClick={() => {
                              if (stripeVerificationUrl) {
                                window.location.href = stripeVerificationUrl;
                              } else {
                                handleConnectStripe();
                              }
                            }}
                            disabled={isConnectingStripe}
                            className="w-full sm:w-auto px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 text-sm font-semibold min-h-[44px]"
                          >
                            {isConnectingStripe ? 'Loading...' : stripeNeedsVerification ? 'Complete Verification' : 'Complete Setup'}
                          </button>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">How payouts work</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">1</div>
                            <p>When a renter books your parking space, they pay through our platform</p>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">2</div>
                            <p>We transfer your earnings (minus platform fee) to your Stripe account</p>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">3</div>
                            <p>Stripe deposits funds to your bank account (typically daily)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="bg-white rounded-xl shadow-sm border border-mist-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6 gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Listings</h2>
                  <button
                    onClick={() => setShowAddListingModal(true)}
                    disabled={isLoadingListings}
                    className="w-full sm:w-auto px-4 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] font-semibold"
                  >
                    {isLoadingListings ? 'Loading...' : 'Add New Listing'}
                  </button>
                </div>
                {isLoadingListings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your listings...</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't created any listings yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add New Listing" to get started!</p>
                  </div>
                ) : (
                  listings.map((listing) => (
                    <div key={listing.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Photo Section */}
                      {listing.photos && listing.photos.length > 0 && listing.photos[0]?.url ? (
                        <div className="relative h-48 bg-gray-200">
                          <img
                            src={listing.photos[0].url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                    <div class="text-center text-gray-400">
                                      <svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <p class="text-sm">Photo unavailable</p>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                          {listing.photos.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              +{listing.photos.length - 1} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <Car className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">No photos</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Listing Details */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{listing.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">{listing.address}</p>
                            {listing.description && (
                              <p className="text-gray-600 text-sm mt-2 line-clamp-2">{listing.description}</p>
                            )}
                            <div className="flex flex-wrap items-center mt-2 gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="whitespace-nowrap">${listing.hourly_rate || listing.price}/hr</span>
                              <span className="whitespace-nowrap">{listing.total_bookings || 0} bookings</span>
                              <span className="whitespace-nowrap">${listing.total_earnings || 0} earned</span>
                            </div>
                            <div className="flex items-center mt-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                listing.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {listing.status === 'pending_review' ? 'Pending Review' :
                                 listing.status === 'active' ? 'Active' : listing.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 ml-0 sm:ml-4">
                            <button
                              onClick={() => handleEditListing(listing)}
                              className="p-2.5 text-gray-500 hover:text-accent-700 hover:bg-accent-500/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                              title="Edit listing"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(listing.id)}
                              className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                              title="Delete listing"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Listing Modal with loading state */}
      {showAddListingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col mx-4 shadow-xl">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingListing ? 'Edit Listing' : 'Add New Listing'}
              </h3>
              <button
                onClick={() => {
                  setShowAddListingModal(false);
                  setEditingListing(null);
                  setSelectedPhotos([]);
                  setPhotoPreviews([]);
                  setExistingPhotos([]);
                  // Reset form data
                  setListingFormData({
                    title: '',
                    address: '',
                    price: '',
                    description: '',
                    coordinates: null,
                    city: '',
                    state: '',
                    zipCode: '',
                    propertyType: 'driveway',
                    features: [],
                    requireApproval: false,
                    leadTimeHours: 0,
                    availability: {
                      monday: { start: '09:00', end: '17:00', available: true },
                      tuesday: { start: '09:00', end: '17:00', available: true },
                      wednesday: { start: '09:00', end: '17:00', available: true },
                      thursday: { start: '09:00', end: '17:00', available: true },
                      friday: { start: '09:00', end: '17:00', available: true },
                      saturday: { start: '09:00', end: '17:00', available: true },
                      sunday: { start: '09:00', end: '17:00', available: true }
                    }
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              const listingData = {
                title: listingFormData.title,
                address: listingFormData.address,
                price: listingFormData.price,
                description: listingFormData.description,
                city: listingFormData.city,
                state: listingFormData.state,
                zip_code: listingFormData.zipCode,
                property_type: listingFormData.propertyType,
                coordinates: listingFormData.coordinates,
                features: listingFormData.features,
                require_approval: listingFormData.requireApproval,
                lead_time_hours: listingFormData.leadTimeHours,
                instant_booking: !listingFormData.requireApproval,
                availability: listingFormData.availability,
                photos: (document.getElementById('photo-upload') as HTMLInputElement)?.files || null,
              };
              handleSubmitListing(listingData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={listingFormData.title}
                    onChange={(e) => setListingFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="e.g., Downtown Parking Spot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <MapboxAutocomplete
                    value={listingFormData.address || ''}
                    onChange={(value) => setListingFormData(prev => ({ ...prev, address: value }))}
                    onSelect={(place) => {
                      setListingFormData(prev => ({ ...prev, address: place.place_name }));
                      // Store coordinates for future use
                      setListingFormData(prev => ({ 
                        ...prev, 
                        coordinates: place.center,
                        city: place.context?.find(ctx => ctx.id.includes('place'))?.text || '',
                        state: place.context?.find(ctx => ctx.id.includes('region'))?.text || '',
                        zipCode: place.context?.find(ctx => ctx.id.includes('postcode'))?.text || ''
                      }));
                    }}
                    placeholder="e.g. Halifax, NS"
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Start typing and we'll suggest addresses for you
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <select
                    value={listingFormData.propertyType}
                    onChange={(e) => setListingFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                  >
                    <option value="driveway">Driveway</option>
                    <option value="garage">Garage</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="barn">Barn</option>
                    <option value="storage">Storage (boats, RVs, motorcycles, etc.)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={listingFormData.description}
                    onChange={(e) => setListingFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="Describe your driveway, parking space, or any special features..."
                  />
                </div>

                {/* Features/Tags Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features & Amenities
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Covered',
                      '24/7 Access',
                      'Security Camera',
                      'Well Lit',
                      'Easy Access',
                      'EV Charging',
                      'Security Guard',
                      'Free WiFi',
                      'Gated',
                      'Paved',
                      'Grass',
                      'Street View'
                    ].map((feature) => (
                      <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={listingFormData.features.includes(feature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setListingFormData(prev => ({
                                ...prev,
                                features: [...prev.features, feature]
                              }));
                            } else {
                              setListingFormData(prev => ({
                                ...prev,
                                features: prev.features.filter(f => f !== feature)
                              }));
                            }
                          }}
                          className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Select all features that apply to your parking space
                  </p>
                </div>

                {/* Availability Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Availability
                  </label>

                  {/* Quick actions: All Day + Copy from day to all */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setListingFormData(prev => ({
                          ...prev,
                          availability: Object.fromEntries(
                            Object.entries(prev.availability).map(([d, s]) => [
                              d,
                              { ...s, start: '00:00', end: '23:59' }
                            ])
                          ) as typeof prev.availability
                        }));
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-mist-100 text-charcoal-700 rounded hover:bg-mist-200"
                    >
                      All Day (every day)
                    </button>
                    <span className="text-gray-400 text-xs hidden sm:inline">|</span>
                    <span className="text-xs text-gray-600">Copy</span>
                    <select
                      className="text-xs border border-mist-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                      value="copy-source"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'copy-source') return;
                        const sourceDay = val as keyof typeof listingFormData.availability;
                        const source = listingFormData.availability[sourceDay];
                        if (!source) return;
                        setListingFormData(prev => ({
                          ...prev,
                          availability: {
                            monday: { ...prev.availability.monday, start: source.start, end: source.end },
                            tuesday: { ...prev.availability.tuesday, start: source.start, end: source.end },
                            wednesday: { ...prev.availability.wednesday, start: source.start, end: source.end },
                            thursday: { ...prev.availability.thursday, start: source.start, end: source.end },
                            friday: { ...prev.availability.friday, start: source.start, end: source.end },
                            saturday: { ...prev.availability.saturday, start: source.start, end: source.end },
                            sunday: { ...prev.availability.sunday, start: source.start, end: source.end }
                          }
                        }));
                        e.target.value = 'copy-source';
                      }}
                    >
                      <option value="copy-source">from day…</option>
                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)} → all days
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(listingFormData.availability).map(([day, schedule]) => (
                      <div key={day} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <label className="flex items-center space-x-2 min-w-[80px]">
                          <input
                            type="checkbox"
                            checked={schedule.available}
                            onChange={(e) => {
                              setListingFormData(prev => ({
                                ...prev,
                                availability: {
                                  ...prev.availability,
                                  [day]: {
                                    ...prev.availability[day as keyof typeof prev.availability],
                                    available: e.target.checked
                                  }
                                }
                              }));
                            }}
                            className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                        </label>

                        {schedule.available && (
                          <>
                            <input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => {
                                setListingFormData(prev => ({
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    [day]: {
                                      ...prev.availability[day as keyof typeof prev.availability],
                                      start: e.target.value
                                    }
                                  }
                                }));
                              }}
                              className="px-2 py-1 text-sm border border-mist-300 rounded focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-500">to</span>
                            <input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => {
                                setListingFormData(prev => ({
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    [day]: {
                                      ...prev.availability[day as keyof typeof prev.availability],
                                      end: e.target.value
                                    }
                                  }
                                }));
                              }}
                              className="px-2 py-1 text-sm border border-mist-300 rounded focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setListingFormData(prev => ({
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    [day]: {
                                      ...prev.availability[day as keyof typeof prev.availability],
                                      start: '00:00',
                                      end: '23:59'
                                    }
                                  }
                                }));
                              }}
                              className="px-2 py-1 text-xs text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded"
                            >
                              All Day
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    💡 e.g. overnight for winter parking bans: set one day (e.g. 6 PM–8 AM), then copy that day to all days
                  </p>
                </div>

              {/* Booking Preferences */}
              <div className="bg-accent-50 border border-accent-100 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Booking Preferences</p>
                    <p className="text-xs text-gray-600">Enable host approval if you want to review requests before confirming.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <span className="mr-2 text-sm text-gray-700">Require approval</span>
                    <input
                      type="checkbox"
                      checked={listingFormData.requireApproval}
                      onChange={(e) => setListingFormData(prev => ({ ...prev, requireApproval: e.target.checked }))}
                      className="h-4 w-4 text-accent-600 focus:ring-accent-400 border-gray-300 rounded"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead time (hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={listingFormData.leadTimeHours}
                      onChange={(e) => setListingFormData(prev => ({ ...prev, leadTimeHours: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                      placeholder="0"
                      disabled={!listingFormData.requireApproval}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Set to 0 for instant booking. If enabled, requests inside this window require approval.
                    </p>
                  </div>
                </div>
              </div>

                          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
              <input
                name="photos"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="photo-upload"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const fileArray = Array.from(files);
                    setSelectedPhotos(prev => [...prev, ...fileArray]);
                    
                    // Create previews
                    fileArray.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setPhotoPreviews(prev => [...prev, e.target?.result as string]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                }}
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-accent-600 hover:text-accent-500">
                        Click to upload
                      </span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                  </div>
                </div>
              </label>
            </div>
            
            {/* Existing Photos (when editing) */}
            {editingListing && existingPhotos.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Current Photos:</p>
                <div className="flex flex-wrap gap-2">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Photo Preview */}
            {photoPreviews.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">New Photos to Upload:</p>
                <div className="flex flex-wrap gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                          setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="mt-2 text-xs text-gray-500">
              💡 Tip: Upload multiple photos to showcase your parking space from different angles
            </p>
          </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Hour ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={listingFormData.price}
                    onChange={(e) => setListingFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddListingModal(false);
                    setEditingListing(null);
                    setSelectedPhotos([]);
                    setPhotoPreviews([]);
                    setExistingPhotos([]);
                    // Reset form data
                    setListingFormData({
                      title: '',
                      address: '',
                      price: '',
                      description: '',
                      coordinates: null,
                      city: '',
                      state: '',
                      zipCode: '',
                      propertyType: 'driveway',
                      features: [],
                      requireApproval: false,
                      leadTimeHours: 0,
                      availability: {
                        monday: { start: '09:00', end: '17:00', available: true },
                        tuesday: { start: '09:00', end: '17:00', available: true },
                        wednesday: { start: '09:00', end: '17:00', available: true },
                        thursday: { start: '09:00', end: '17:00', available: true },
                        friday: { start: '09:00', end: '17:00', available: true },
                        saturday: { start: '09:00', end: '17:00', available: true },
                        sunday: { start: '09:00', end: '17:00', available: true }
                      }
                    });
                  }}
                  disabled={isSubmittingListing}
                  className="flex-1 px-4 py-2 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingListing}
                  className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingListing 
                    ? (editingListing ? 'Updating...' : 'Creating...') 
                    : (editingListing ? 'Update Listing' : 'Add Listing')}
                </button>
              </div>
            </form>
            </div>
            
            {/* Modal Footer - Fixed */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                💡 Your listing will be reviewed before going live
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingListingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Listing</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingListingId(null);
                }}
                className="px-4 py-2 text-gray-700 border border-mist-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteListing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Change Profile Picture</h3>
                <button
                  onClick={() => {
                    stopWebcam()
                    setShowAvatarModal(false)
                    setAvatarPreview(null)
                    setSelectedAvatarFile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Webcam View */}
              {showWebcam ? (
                <div className="mb-6">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto max-h-64 object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={stopWebcam}
                      className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-semibold"
                    >
                      Capture Photo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Preview */}
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="w-32 h-32 rounded-full object-cover border-4 border-accent-500"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                          <User className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Options */}
                  <div className="mb-6 space-y-3">
                    {/* File Upload */}
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileSelect}
                        className="hidden"
                        id="avatar-upload"
                        disabled={isUploadingAvatar}
                      />
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-accent-500 transition-colors cursor-pointer">
                        <Camera className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 text-center">
                          <span className="font-medium text-accent-600">Click to upload</span> from device
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </label>

                    {/* Webcam Button */}
                    <button
                      onClick={startWebcam}
                      disabled={isUploadingAvatar}
                      className="w-full flex items-center justify-center px-4 py-3 border-2 border-accent-500 text-accent-600 rounded-lg hover:bg-accent-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Take Photo with Webcam
                    </button>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopWebcam()
                    setShowAvatarModal(false)
                    setAvatarPreview(null)
                    setSelectedAvatarFile(null)
                  }}
                  disabled={isUploadingAvatar}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                {avatarPreview && (
                  <button
                    onClick={() => uploadAvatar()}
                    disabled={isUploadingAvatar}
                    className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {isUploadingAvatar ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Photo'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessagesModal && selectedBookingForMessages && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto shadow-2xl max-h-full sm:max-h-[90vh] flex flex-col">
            <div className="flex-1 overflow-hidden p-0 sm:p-4 min-h-0">
              <BookingMessages
                bookingId={selectedBookingForMessages}
                onClose={() => {
                  setShowMessagesModal(false)
                  setSelectedBookingForMessages(null)
                }}
                otherUser={(() => {
                  const booking = bookings.find((b: any) => b.id === selectedBookingForMessages)
                  if (!booking) return undefined
                  const isRenter = user?.id === booking.renter_id
                  const otherUser = isRenter ? booking.host : booking.renter
                  return otherUser ? {
                    id: otherUser.id,
                    firstName: otherUser.first_name || otherUser.firstName,
                    lastName: otherUser.last_name || otherUser.lastName,
                    avatar: otherUser.avatar,
                  } : undefined
                })()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReviewBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedReviewBooking(null)
          }}
          bookingId={selectedReviewBooking.bookingId}
          propertyTitle={selectedReviewBooking.propertyTitle}
          reviewedUserName={selectedReviewBooking.reviewedUserName}
          onReviewSubmitted={() => {
            // Refresh notifications after review is submitted
            if (activeTab === 'profile') {
              fetchNotifications()
            }
          }}
        />
      )}

      {/* Mobile Bottom Navigation - Only show when logged in */}
      {user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-lg">
          <nav className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    // Scroll to top when switching tabs
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-colors min-h-[60px] min-w-[60px] touch-target ${
                    activeTab === tab.id
                      ? 'text-accent-500'
                      : 'text-gray-600'
                  }`}
                  title={tab.label}
                >
                  <Icon className={`h-6 w-6 mb-1 ${activeTab === tab.id ? 'text-accent-500' : 'text-gray-600'}`} />
                  <span className={`text-[10px] font-medium ${activeTab === tab.id ? 'text-accent-500' : 'text-gray-600'}`}>
                    {tab.label.replace(/^My /, '')}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
} 