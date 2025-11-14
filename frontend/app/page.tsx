import Link from 'next/link'
import { SearchBar } from '@/components/SearchBar'
import { FeatureCard } from '@/components/FeatureCard'
import { TestimonialCard } from '@/components/TestimonialCard'
import dynamic from 'next/dynamic'
import {
  Shield,
  Clock,
  MapPin,
  Star,
  Calendar
} from 'lucide-react'

const HeroVideo = dynamic(() => import('@/components/HeroVideo'), { ssr: false })

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/75 to-mist-200/70 backdrop-blur-sm" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Rent Driveways by the{' '}
              <span className="text-accent-500">Hour</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Find secure parking spaces in your neighborhood. Rent your driveway and earn money. 
              Simple, safe, and convenient.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
              <SearchBar />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/find-parking" 
                className="btn-primary text-lg px-8 py-3"
              >
                Find Parking
              </Link>
              <Link 
                href="/list-your-driveway" 
                className="btn-secondary text-lg px-8 py-3"
              >
                List Your Driveway
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story Block */}
      <section className="relative bg-gradient-to-b from-mist-50 via-white via-65% to-sand-100 text-charcoal-800">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(61,187,133,0.22),_transparent_65%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-accent-500/15 text-accent-600 text-xs font-semibold uppercase tracking-[0.3em]">
              Marketplace Built on Trust
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mt-4 mb-3">
              Why Choose plekk?
            </h2>
            <p className="text-lg md:text-xl text-charcoal-500 max-w-2xl mx-auto">
              The smartest way to find parking and earn from your driveway
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <FeatureCard
              icon={<Shield className="w-8 h-8" strokeWidth={1.6} />}
              title="Secure Parking"
              description="All spaces are verified and secure with 24/7 monitoring and insurance coverage."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" strokeWidth={1.6} />}
              title="Flexible Hours"
              description="Rent by the hour, day, or week. Set your own schedule and availability."
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8" strokeWidth={1.6} />}
              title="Convenient Locations"
              description="Find parking near your destination or list your space in high-demand areas."
            />
          </div>

          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-1 rounded-full bg-accent-500/15 text-accent-600 text-xs font-semibold uppercase tracking-[0.3em]">
              Launch Your Listing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mt-4 mb-3">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-charcoal-600 max-w-2xl mx-auto">
              Simple steps to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center px-6 py-8 rounded-2xl bg-white border border-mist-200 shadow-lg shadow-primary-900/10">
              <div className="bg-accent-500/15 border border-accent-400/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-accent-600 shadow-[0_10px_30px_rgba(61,187,133,0.18)]">
                <MapPin className="w-8 h-8" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-3">
                List Your Space
              </h3>
              <p className="text-sm text-charcoal-600">
                Take photos, set your price, and list your driveway in minutes
              </p>
            </div>

            <div className="text-center px-6 py-8 rounded-2xl bg-white border border-mist-200 shadow-lg shadow-primary-900/10">
              <div className="bg-sand-300/20 border border-sand-300/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-sand-600 shadow-[0_10px_30px_rgba(220,203,190,0.18)]">
                <Calendar className="w-8 h-8" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-3">
                Get Bookings
              </h3>
              <p className="text-sm text-charcoal-600">
                Receive booking requests and manage your availability
              </p>
            </div>

            <div className="text-center px-6 py-8 rounded-2xl bg-white border border-mist-200 shadow-lg shadow-primary-900/10">
              <div className="bg-accent-500/15 border border-accent-400/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-accent-600 shadow-[0_10px_30px_rgba(61,187,133,0.18)]">
                <Star className="w-8 h-8" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-3">
                Earn Money
              </h3>
              <p className="text-sm text-charcoal-600">
                Get paid automatically and track your earnings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Hidden for now */}
      {false && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Our Users Say
              </h2>
              <p className="text-xl text-gray-600">
                Join thousands of satisfied hosts and renters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <TestimonialCard
                name="Sarah Johnson"
                role="Host"
                content="I've been hosting my driveway for 6 months and earned over $2,000. The platform is so easy to use!"
                rating={5}
              />
              <TestimonialCard
                name="Mike Chen"
                role="Renter"
                content="Perfect for when I need parking near the airport. Much cheaper than airport parking and very convenient."
                rating={5}
              />
              <TestimonialCard
                name="Emily Rodriguez"
                role="Host"
                content="Great way to make extra income. The support team is amazing and the app is very user-friendly."
                rating={5}
              />
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-b from-sand-100 via-white to-mist-50 overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(49,99,127,0.18),_transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-900/10 text-primary-800 text-sm font-medium mb-6 shadow-sm border border-primary-800/15">
            Driveway Hosts & Drivers Welcome
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-charcoal-600 mb-10 max-w-3xl mx-auto">
            Join thousands of people who are already earning money from their driveways 
            or finding convenient parking solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/signup" 
              className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold bg-accent-500 text-charcoal-900 shadow-lg shadow-accent-500/25 hover:bg-accent-600 hover:shadow-accent-600/40 transition"
            >
              Sign Up Now
            </Link>
            <Link 
              href="/find-parking" 
              className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold border-2 border-primary-200 text-primary-700 bg-white/70 backdrop-blur hover:bg-white transition"
            >
              Find Parking
            </Link>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-charcoal-500 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-500 shadow-[0_0_12px_rgba(61,187,133,0.45)]" />
              Secure payments protected by Stripe Connect
            </div>
            <div className="hidden sm:block h-3 w-px bg-primary-200" />
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sand-400 shadow-[0_0_12px_rgba(220,203,190,0.45)]" />
              5% service fee for hosts + 5% for drivers — shared evenly every booking
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 