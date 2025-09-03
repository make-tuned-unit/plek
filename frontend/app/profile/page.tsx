'use client'

import { useState, useEffect } from 'react'
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
  Trash2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import toast from 'react-hot-toast'

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
  const { user, logout, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
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
      zipCode: user?.zip_code || '',
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
        zipCode: user.zip_code || '',
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
        zipCode: user.zip_code || '',
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  // Add Listing functionality
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  // Fetch user's properties on component mount
  useEffect(() => {
    if (user) {
      fetchUserProperties();
    }
  }, [user]);

  const fetchUserProperties = async () => {
    try {
      setIsLoadingListings(true);
      const response = await apiService.getUserProperties();
      if (response.success && response.data) {
        setListings(response.data.properties || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load your listings');
    } finally {
      setIsLoadingListings(false);
    }
  };

  const handleSubmitListing = async (listingData: any) => {
    try {
      setIsSubmittingListing(true);
      
      // Prepare data for backend
      const propertyData = {
        title: listingData.title,
        description: listingData.description || '',
        address: listingData.address,
        city: '', // Will be extracted from address or user input
        state: '', // Will be extracted from address or user input
        zip_code: '', // Will be extracted from address or user input
        price: parseFloat(listingData.price),
        property_type: 'driveway',
        max_vehicles: 1
      };

      const response = await apiService.createProperty(propertyData);
      
      if (response.success) {
        toast.success('Listing created successfully!');
        setShowAddListingModal(false);
        // Refresh the listings
        fetchUserProperties();
      } else {
        throw new Error(response.error || 'Failed to create listing');
      }
    } catch (error: any) {
      console.error('Error adding listing:', error);
      toast.error(error.message || 'Failed to add listing');
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
                      <img
                        src={user?.avatar || '/api/placeholder/150/150'}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                      />
                      <button className="absolute bottom-4 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700">
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
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
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
                      className="flex items-center px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                      <input
                        {...register('address')}
                        type="text"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        {...register('city')}
                        type="text"
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                              : 'bg-blue-100 text-blue-800'
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingListings ? 'Loading...' : 'Add New Listing'}
                  </button>
                </div>
                {isLoadingListings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your listings...</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't created any listings yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add New Listing" to get started!</p>
                  </div>
                ) : (
                  listings.map((listing) => (
                    <div key={listing.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{listing.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">{listing.address}</p>
                          {listing.description && (
                            <p className="text-gray-600 text-sm mt-2">{listing.description}</p>
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
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Methods</h2>
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods added</h3>
                  <p className="text-gray-600 mb-4">Add a payment method to receive earnings</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add Payment Method
                  </button>
                </div>
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
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Email notifications for new bookings</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">SMS notifications for urgent messages</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <span className="ml-2 text-sm text-gray-700">Marketing emails and promotions</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Show my profile to other users</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Listing</h3>
              <button
                onClick={() => setShowAddListingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const listingData = {
                title: formData.get('title') as string,
                address: formData.get('address') as string,
                price: formData.get('price') as string,
                description: formData.get('description') as string,
                photos: formData.get('photos') as File | null,
              };
              handleSubmitListing(listingData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Title *
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Downtown Parking Spot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    name="address"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Start typing your address..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Tip: Start typing and we'll suggest addresses for you
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    🔧 Address autocomplete coming soon with Google Places API
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your driveway, parking space, or any special features..."
                  />
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
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Camera className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                              Click to upload
                            </span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Hour ($) *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddListingModal(false)}
                  disabled={isSubmittingListing}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingListing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingListing ? 'Creating...' : 'Add Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 