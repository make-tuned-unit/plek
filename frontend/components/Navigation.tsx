'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Menu, X, User, Car, MapPin, LogOut, ChevronDown, Settings, CreditCard, Calendar, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { user, logout } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Successfully logged out')
    setIsMenuOpen(false)
    setIsDropdownOpen(false)
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    setIsMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Car className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">DriveMyWay</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/find-parking" 
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Find Parking
            </Link>
            <Link 
              href="/list-your-driveway" 
              className="text-gray-600 hover:text-gray-900"
            >
              List Your Driveway
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                >
                  <div className="flex items-center space-x-2">
                    {user.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium">{user.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      href="/profile"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=bookings"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Calendar className="h-4 w-4 mr-3" />
                      My Bookings
                    </Link>
                    <Link
                      href="/profile?tab=listings"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Car className="h-4 w-4 mr-3" />
                      My Listings
                    </Link>
                    <Link
                      href="/profile?tab=payments"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      Payments
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/admin"
                          onClick={handleProfileClick}
                          className="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 font-medium"
                        >
                          <Shield className="h-4 w-4 mr-3" />
                          Admin Dashboard
                        </Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link 
                  href="/auth/signin" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-4">
              <Link 
                href="/find-parking" 
                className="block text-gray-600 hover:text-gray-900 flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Find Parking
              </Link>
              <Link 
                href="/list-your-driveway" 
                className="block text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                List Your Driveway
              </Link>
              {user && (
                <>
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 mb-4">
                      {user.avatar && (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="text-sm text-gray-700 font-medium">{user.name}</span>
                    </div>
                    <Link
                      href="/profile"
                      className="block text-gray-600 hover:text-gray-900 flex items-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=bookings"
                      className="block text-gray-600 hover:text-gray-900 flex items-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      My Bookings
                    </Link>
                    <Link
                      href="/profile?tab=listings"
                      className="block text-gray-600 hover:text-gray-900 flex items-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Car className="h-4 w-4 mr-2" />
                      My Listings
                    </Link>
                    <Link
                      href="/profile?tab=payments"
                      className="block text-gray-600 hover:text-gray-900 flex items-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payments
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      className="block text-gray-600 hover:text-gray-900 flex items-center mb-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                      <Link
                        href="/admin"
                        className="block text-blue-600 hover:text-blue-700 flex items-center mb-2 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-red-600 hover:text-red-700 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
              {!user && (
                <div className="pt-4 border-t">
                  <Link 
                    href="/auth/signin" 
                    className="block text-gray-600 hover:text-gray-900 mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 