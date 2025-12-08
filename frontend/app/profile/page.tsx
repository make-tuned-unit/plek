'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
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
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import toast from 'react-hot-toast'
import { MapboxAutocomplete } from '../../components/MapboxAutocomplete'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>



const mockBookings = [
  {
    id: 1,
    propertyTitle: 'Downtown Parking Spot',
    address: '123 Main St, Downtown',
    date: '2024-01-20',
    time: '14:00 - 18:00',
    duration: '4 hours',
    price: 60.00,
    status: 'completed',
    rating: 5,
  },
  {
    id: 2,
    propertyTitle: 'Residential Driveway',
    address: '456 Oak Ave, Residential Area',
    date: '2024-01-18',
    time: '09:00 - 17:00',
    duration: '8 hours',
    price: 64.00,
    status: 'completed',
    rating: 4,
  },
  {
    id: 3,
    propertyTitle: 'Secure Parking Garage',
    address: '789 Business Blvd, Commercial District',
    date: '2024-01-25',
    time: '10:00 - 12:00',
    duration: '2 hours',
    price: 50.00,
    status: 'upcoming',
    rating: null,
  },
]

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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, logout, isLoading: authLoading, updateProfile } = useAuth()
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
  const [listingFormData, setListingFormData] = useState({
    title: '',
    address: '',
    price: '',
    description: '',
    coordinates: null as [number, number] | null,
    city: '',
    state: '',
    zipCode: '',
    features: [] as string[],
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
      })
    }
  }, [user, reset])

  // Handle tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'bookings', 'listings', 'payments', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

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

  // Fetch user's properties on component mount
  useEffect(() => {
    if (user) {
      // Check if we have a valid token before trying to fetch
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Add a small delay to ensure token is fully available
        const timer = setTimeout(() => {
          fetchUserProperties();
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, fetchUserProperties]);

  // Check Stripe Connect status
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (user) {
        try {
          const response = await apiService.getConnectAccountStatus();
          console.log('[Profile] Stripe status response:', response);
          if (response.success && response.data) {
            console.log('[Profile] Setting connected:', response.data.connected, 'status:', response.data.status);
            setStripeConnected(response.data.connected);
            setStripeStatus(response.data.status || 'pending');
            setStripeNeedsVerification(response.data.needsVerification || false);
            setStripeVerificationUrl(response.data.verificationUrl || null);
          } else {
            console.log('[Profile] Response missing data:', response);
          }
        } catch (error) {
          console.error('Error checking Stripe status:', error);
        }
      }
    };
    checkStripeStatus();
  }, [user]);

  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const response = await apiService.createConnectAccount();
      if (response.success && response.data?.url) {
        // Redirect to Stripe onboarding
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to start Stripe setup');
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast.error(error.message || 'Failed to connect Stripe account');
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
          }
        }).catch(error => {
          console.error('[Profile] Error refreshing status:', error);
        });
      }, 1000);
      // Clean URL
      router.replace('/profile?tab=payments', { scroll: false });
    } else if (stripeRefresh === 'true') {
      // User needs to complete onboarding
      toast.info('Please complete your Stripe account setup');
      router.replace('/profile?tab=payments', { scroll: false });
    }
  }, [searchParams, router]);

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true)
    try {
      // TODO: Implement profile update logic
      console.log('Profile data:', data)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
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
    { id: 'listings', label: 'My Listings', icon: Car },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
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
      features: listing.features || [],
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

  const uploadPhotos = async (propertyId: string, files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('propertyId', propertyId);
        
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/properties/${propertyId}/photos`, {
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
            // If response is not JSON, use status text
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
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmitListing = async (listingData: any) => {
    try {
      setIsSubmittingListing(true);
      
      // Prepare data for backend
      const propertyData = {
        title: listingData.title,
        description: listingData.description || '',
        address: listingData.address,
        city: listingData.city || '',
        state: listingData.state || '',
        zip_code: listingData.zip_code || '',
        price: listingData.price, // Backend expects 'price' not 'hourly_rate'
        property_type: 'driveway',
        max_vehicles: 1,
        coordinates: listingData.coordinates // Include coordinates from the form
      };

      let response;
      let propertyId: string;
      
      if (editingListing) {
        // Update existing listing
        propertyId = editingListing.id;
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
      
      if (response.success && propertyId) {
        // Upload photos if any were selected
        if (selectedPhotos.length > 0) {
          toast.loading('Uploading photos...', { id: 'photo-upload' });
          await uploadPhotos(propertyId, selectedPhotos);
          toast.success('Photos uploaded successfully!', { id: 'photo-upload' });
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
          features: [],
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
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
                      <button className="absolute bottom-4 right-0 bg-accent-500 text-white rounded-full p-2 hover:bg-accent-600">
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <p className="text-gray-600">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</p>
                    <div className="flex items-center justify-center mt-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">{user?.rating || 0}</span>
                      <span className="ml-1 text-sm text-gray-500">({user?.review_count || 0} reviews)</span>
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Bookings</span>
                  <span className="font-medium">{user?.total_bookings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="font-medium">${user?.total_earnings || 0}</span>
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center px-4 py-2 text-sm text-accent-600 border border-accent-400 rounded-lg hover:bg-accent-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-4 py-2 text-sm text-gray-600 border border-mist-300 rounded-lg hover:bg-mist-100"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 text-sm text-white bg-accent-500 rounded-lg hover:bg-accent-600 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

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
                        className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent disabled:bg-gray-50"
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
                            // Extract city, state, zip from place context
                            const city = place.context?.find(ctx => ctx.id.includes('place'))?.text || '';
                            const state = place.context?.find(ctx => ctx.id.includes('region'))?.text || '';
                            const zipCode = place.context?.find(ctx => ctx.id.includes('postcode'))?.text || '';
                            setValue('city', city);
                            setValue('state', state);
                            setValue('zipCode', zipCode);
                          }}
                          placeholder="Enter your address"
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
                        ZIP Code
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
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">My Bookings</h2>
                <div className="space-y-4">
                  {mockBookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{booking.propertyTitle}</h3>
                          <p className="text-gray-600 text-sm mt-1">{booking.address}</p>
                          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {booking.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {booking.time}
                            </span>
                            <span>{booking.duration}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${booking.price}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            booking.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-accent-50 text-accent-800'
                          }`}>
                            {booking.status}
                          </span>
                          {booking.rating && (
                            <div className="flex items-center mt-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600 ml-1">{booking.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
                  <button
                    onClick={() => setShowAddListingModal(true)}
                    disabled={isLoadingListings}
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div key={listing.id} className="border border-gray-200 rounded-lg overflow-hidden">
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
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{listing.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">{listing.address}</p>
                            {listing.description && (
                              <p className="text-gray-600 text-sm mt-2 line-clamp-2">{listing.description}</p>
                            )}
                            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                              <span>${listing.hourly_rate || listing.price}/hr</span>
                              <span>{listing.total_bookings || 0} bookings</span>
                              <span>${listing.total_earnings || 0} earned</span>
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
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleEditListing(listing)}
                              className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded transition-colors"
                              title="Edit listing"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(listing.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Payout Account</h2>
                
                {!stripeConnected ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Stripe Account</h3>
                    <p className="text-gray-600 mb-4 max-w-md mx-auto">
                      To receive payments from bookings, you need to connect your Stripe account. 
                      This allows us to securely transfer your earnings directly to your bank account.
                    </p>
                    <button
                      onClick={handleConnectStripe}
                      disabled={isConnectingStripe}
                      className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isConnectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                      You'll be redirected to Stripe to securely set up your account
                    </p>
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
                          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 text-sm font-semibold"
                        >
                          {isConnectingStripe ? 'Loading...' : stripeNeedsVerification ? 'Complete Verification' : 'Complete Setup'}
                        </button>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">How Payouts Work</h3>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                            1
                          </div>
                          <p>When a renter books your parking space, they pay through our platform</p>
                        </div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                            2
                          </div>
                          <p>We automatically transfer your earnings (minus platform fee) to your Stripe account</p>
                        </div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                            3
                          </div>
                          <p>Stripe automatically deposits funds to your bank account (typically daily)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
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
                    features: [],
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
                coordinates: listingFormData.coordinates,
                features: listingFormData.features,
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
                    placeholder="Start typing your address..."
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Start typing and we'll suggest addresses for you
                  </p>
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
                  
                  {/* Quick Set All Days Button */}
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const startTime = listingFormData.availability.monday.start;
                        const endTime = listingFormData.availability.monday.end;
                        setListingFormData(prev => ({
                          ...prev,
                          availability: {
                            monday: { start: startTime, end: endTime, available: true },
                            tuesday: { start: startTime, end: endTime, available: true },
                            wednesday: { start: startTime, end: endTime, available: true },
                            thursday: { start: startTime, end: endTime, available: true },
                            friday: { start: startTime, end: endTime, available: true },
                            saturday: { start: startTime, end: endTime, available: true },
                            sunday: { start: startTime, end: endTime, available: true }
                          }
                        }));
                      }}
                      className="px-3 py-1 text-xs bg-accent-50 text-accent-700 rounded hover:bg-accent-100"
                    >
                      🕐 Set All Days to Same Time
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(listingFormData.availability).map(([day, schedule]) => (
                      <div key={day} className="flex items-center space-x-3">
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
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Set when your parking space is available each day
                  </p>
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
                      features: [],
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
    </div>
  )
} 