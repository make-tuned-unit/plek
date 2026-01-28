'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, User, Car, MapPin, LogOut, ChevronDown, CreditCard, Calendar, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { user, logout } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: Event) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
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

  const handleListDrivewayClick = (event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    event?.preventDefault()
    setIsMenuOpen(false)
    setIsDropdownOpen(false)

    if (user) {
      router.push('/list-your-driveway')
    } else {
      const redirectTarget = encodeURIComponent('/list-your-driveway')
      router.push(`/auth/signup?redirect=${redirectTarget}&host=true`)
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto container-padding">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group transition-transform duration-200 hover:scale-105">
            <img 
              src="/logo.png?v=2" 
              alt="plekk logo" 
              className="flex-shrink-0 h-10 md:h-12 w-auto object-contain transition-opacity duration-200 group-hover:opacity-90"
              style={{ maxHeight: '48px', maxWidth: '300px' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              href="/find-parking" 
              className="px-4 py-2 text-charcoal-700 hover:text-accent-600 flex items-center gap-2 rounded-lg transition-all duration-200 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 font-medium text-sm"
            >
              <MapPin className="h-4 w-4" />
              Find Parking
            </Link>
            <Link 
              href="/list-your-driveway" 
              onClick={handleListDrivewayClick}
              className="px-4 py-2 text-charcoal-700 hover:text-accent-600 rounded-lg transition-all duration-200 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 font-medium text-sm"
            >
              List Your Driveway
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-charcoal-700 hover:text-charcoal-900 hover:bg-white/60 backdrop-blur-sm rounded-lg border border-transparent hover:border-white/30 transition-all duration-200 focus-ring shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-2">
                    {user.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full ring-2 ring-accent-200 hover:ring-accent-400 transition-all duration-200"
                      />
                    )}
                    <span className="text-sm font-semibold">{user.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl py-2 z-50 border border-white/30 animate-scale-in overflow-hidden">
                    <Link
                      href="/profile"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2.5 text-sm text-charcoal-700 hover:bg-accent-500/10 hover:text-accent-700 backdrop-blur-sm transition-colors duration-150"
                    >
                      <User className="h-4 w-4 mr-3 text-mist-600" />
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=bookings"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2.5 text-sm text-charcoal-700 hover:bg-accent-500/10 hover:text-accent-700 backdrop-blur-sm transition-colors duration-150"
                    >
                      <Calendar className="h-4 w-4 mr-3 text-mist-600" />
                      My Bookings
                    </Link>
                    <Link
                      href="/profile?tab=listings"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2.5 text-sm text-charcoal-700 hover:bg-accent-500/10 hover:text-accent-700 backdrop-blur-sm transition-colors duration-150"
                    >
                      <Car className="h-4 w-4 mr-3 text-mist-600" />
                      My Listings
                    </Link>
                    <Link
                      href="/profile?tab=payments"
                      onClick={handleProfileClick}
                      className="flex items-center px-4 py-2.5 text-sm text-charcoal-700 hover:bg-accent-500/10 hover:text-accent-700 backdrop-blur-sm transition-colors duration-150"
                    >
                      <CreditCard className="h-4 w-4 mr-3 text-mist-600" />
                      Payments
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                      <>
                        <div className="border-t border-mist-200 my-1"></div>
                        <Link
                          href="/admin"
                          onClick={handleProfileClick}
                          className="flex items-center px-4 py-2.5 text-sm text-accent-700 hover:bg-accent-500/10 font-semibold backdrop-blur-sm transition-colors duration-150"
                        >
                          <Shield className="h-4 w-4 mr-3 text-accent-600" />
                          Admin Dashboard
                        </Link>
                      </>
                    )}
                    <div className="border-t border-mist-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-500/10 backdrop-blur-sm transition-colors duration-150"
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
                  className="px-4 py-2 text-charcoal-700 hover:text-charcoal-900 font-medium text-sm transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="btn-primary px-6 py-2.5 text-sm shadow-lg"
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
              className="p-2 text-charcoal-700 hover:text-charcoal-900 hover:bg-mist-100 rounded-lg transition-colors duration-200 touch-target focus-ring"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-mist-200 animate-slide-down">
            <div className="space-y-1">
              <Link 
                href="/find-parking" 
                className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <MapPin className="h-5 w-5" />
                Find Parking
              </Link>
              <button 
                type="button"
                onClick={handleListDrivewayClick}
                className="block text-left w-full px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 rounded-lg transition-all duration-150 font-medium"
              >
                List Your Driveway
              </button>
              {user && (
                <>
                  <div className="pt-4 border-t border-mist-200">
                    <div className="flex items-center space-x-3 px-4 py-3 mb-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-sm">
                      {user.avatar && (
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="w-10 h-10 rounded-full ring-2 ring-accent-200"
                        />
                      )}
                      <span className="text-sm text-charcoal-800 font-semibold">{user.name}</span>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=bookings"
                      className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Calendar className="h-5 w-5" />
                      My Bookings
                    </Link>
                    <Link
                      href="/profile?tab=listings"
                      className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Car className="h-5 w-5" />
                      My Listings
                    </Link>
                    <Link
                      href="/profile?tab=payments"
                      className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CreditCard className="h-5 w-5" />
                      Payments
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                      <Link
                        href="/admin"
                        className="block px-4 py-3 text-accent-700 hover:text-accent-800 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 flex items-center gap-3 rounded-lg transition-all duration-150 font-semibold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Shield className="h-5 w-5" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-500/10 backdrop-blur-sm border border-transparent hover:border-red-300/30 flex items-center gap-3 rounded-lg transition-all duration-150"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
              {!user && (
                <div className="pt-4 border-t border-mist-200 space-y-2">
                  <Link 
                    href="/auth/signin" 
                    className="block px-4 py-3 text-charcoal-700 hover:text-accent-600 hover:bg-accent-500/10 backdrop-blur-sm border border-transparent hover:border-accent-300/30 rounded-lg transition-all duration-150 font-medium text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="block btn-primary text-center shadow-lg"
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