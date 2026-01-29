import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-primary-900 via-primary-800 to-charcoal-900 text-mist-100 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-accent-500/20 via-transparent to-primary-600/20 pointer-events-none" />
      <div className="max-w-7xl mx-auto container-padding py-16 md:py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16">
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
            <div className="flex flex-wrap items-center gap-3">
              <a href="#" className="group inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary-800/60 hover:bg-accent-500 transition-all duration-300 shadow-md hover:shadow-accent-500/40 text-accent-300 hover:text-charcoal-900 transform hover:scale-110" aria-label="Facebook">
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="group inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary-800/60 hover:bg-accent-500 transition-all duration-300 shadow-md hover:shadow-accent-500/40 text-accent-300 hover:text-charcoal-900 transform hover:scale-110" aria-label="LinkedIn">
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="#" className="group inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary-800/60 hover:bg-accent-500 transition-all duration-300 shadow-md hover:shadow-accent-500/40 text-accent-300 hover:text-charcoal-900 transform hover:scale-110" aria-label="Bluesky">
                <img src="/BlueSkysocial.png" alt="Bluesky" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 object-contain" />
              </a>
              <a href="#" className="group inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary-800/60 hover:bg-accent-500 transition-all duration-300 shadow-md hover:shadow-accent-500/40 text-accent-300 hover:text-charcoal-900 transform hover:scale-110" aria-label="Instagram">
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
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

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">
              Support
            </h3>
            <ul className="space-y-3 text-mist-200/90">
              <li>
                <Link href="/help" className="hover:text-accent-300 transition-colors duration-200 inline-block">
                  Help Center
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