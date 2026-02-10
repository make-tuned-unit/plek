'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, BookOpen, ChevronDown } from 'lucide-react'

export function Footer() {
  const [openSection, setOpenSection] = useState<'quick' | 'support' | null>(null)

  const toggleSection = (section: 'quick' | 'support') => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  return (
    <footer className="bg-gradient-to-b from-primary-900 via-primary-800 to-charcoal-900 text-mist-100 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-accent-500/20 via-transparent to-primary-600/20 pointer-events-none" />
      <div className="max-w-7xl mx-auto container-padding py-16 md:py-20 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-16">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <Link href="/" className="flex items-center transition-transform duration-200 hover:scale-105">
                <img
                  src="/logo.png"
                  alt="plekk logo"
                  className="h-10 md:h-12 w-auto object-contain"
                  style={{ maxHeight: '48px', maxWidth: '300px' }}
                />
              </Link>
            </div>
            <p className="text-mist-200/90 leading-relaxed mb-6 max-w-lg text-base">
              The smartest way to find parking and earn from your driveway.{' '}
              We connect neighbours with idle space to drivers looking for reliable parking spots.
            </p>
            <p className="text-sm text-mist-300/80">
              Built in Halifax, Nova Scotia
            </p>
          </div>

          {/* Mobile: collapsible Quick Links & Support (accordion) */}
          <div className="md:hidden space-y-2">
            <div className="border-b border-primary-700/60">
              <button
                type="button"
                onClick={() => toggleSection('quick')}
                className="flex items-center justify-between w-full py-4 text-left text-lg font-bold text-white tracking-wide"
                aria-expanded={openSection === 'quick'}
              >
                Quick Links
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 text-mist-300 transition-transform duration-200 ${
                    openSection === 'quick' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  openSection === 'quick' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-3 text-mist-200/90 pb-4">
                    <li>
                      <Link href="/find-parking" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Find Parking
                      </Link>
                    </li>
                    <li>
                      <Link href="/list-your-driveway" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        List Your Driveway
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog" className="hover:text-accent-300 transition-colors duration-200 inline-flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Blog
                      </Link>
                    </li>
                    <li>
                      <Link href="/profile" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        My Profile
                      </Link>
                    </li>
                    <li>
                      <Link href="/auth/signin" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Sign In
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-b border-primary-700/60">
              <button
                type="button"
                onClick={() => toggleSection('support')}
                className="flex items-center justify-between w-full py-4 text-left text-lg font-bold text-white tracking-wide"
                aria-expanded={openSection === 'support'}
              >
                Support
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 text-mist-300 transition-transform duration-200 ${
                    openSection === 'support' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  openSection === 'support' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-3 text-mist-200/90 pb-4">
                    <li>
                      <Link href="/help" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Help Centre
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Terms of Service
                      </Link>
                    </li>
                    <li>
                      <Link href="/privacy" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                        Privacy Policy
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Quick Links & Support always visible */}
          <div className="hidden md:block">
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-3 text-mist-200/90">
              <li>
                <Link href="/find-parking" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Find Parking
                </Link>
              </li>
              <li>
                <Link href="/list-your-driveway" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  List Your Driveway
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-accent-300 transition-colors duration-200 inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/auth/signin" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div className="hidden md:block">
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">
              Support
            </h3>
            <ul className="space-y-3 text-mist-200/90">
              <li>
                <Link href="/help" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-12 pt-10 border-t border-primary-800/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center gap-3 group">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-accent text-charcoal-900 shadow-lg shadow-accent-500/30 transition-transform duration-300 group-hover:scale-110">
                <Mail className="h-5 w-5" />
              </span>
              <a href="mailto:support@parkplekk.com" className="text-mist-100 hover:text-accent-300 transition-colors duration-200">
                support@parkplekk.com
              </a>
            </div>
            <div className="flex items-center gap-3 group">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-accent text-charcoal-900 shadow-lg shadow-accent-500/30 transition-transform duration-300 group-hover:scale-110">
                <Phone className="h-5 w-5" />
              </span>
              <a href="tel:+12703099368" className="text-mist-100 hover:text-accent-300 transition-colors duration-200">
                +1 (270) 309-9368
              </a>
            </div>
            <div className="flex items-center gap-3 group">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-accent text-charcoal-900 shadow-lg shadow-accent-500/30 transition-transform duration-300 group-hover:scale-110">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="text-mist-100">Halifax, Nova Scotia, Canada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-charcoal-900/90 text-center text-sm text-mist-300 py-6 border-t border-primary-900/40">
        <p className="max-w-7xl mx-auto container-padding">
          &copy; {new Date().getFullYear()} plekk. Built in Halifax with trust, transparency, and shared streets in mind.
        </p>
      </div>
    </footer>
  )
} 