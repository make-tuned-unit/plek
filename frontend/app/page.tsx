import Link from 'next/link'
import { SearchBar } from '@/components/SearchBar'
import { FeatureCard } from '@/components/FeatureCard'
import dynamic from 'next/dynamic'
import {
  Shield,
  Clock,
  MapPin,
  DollarSign,
  TrendingUp,
  Leaf,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertTriangle
} from 'lucide-react'

const HeroVideo = dynamic(() => import('@/components/HeroVideo'), { ssr: false })

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-mist-200/75 backdrop-blur-sm" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-10 leading-tight">
              Finding parking shouldn't{' '}
              <span className="text-accent-500">mean circling the block</span>
            </h1>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-10">
              <SearchBar />
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link 
                href="/find-parking" 
                className="group inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-semibold bg-accent-500 text-white shadow-xl shadow-accent-500/30 hover:bg-accent-600 hover:shadow-accent-600/40 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Find Parking
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/list-your-driveway" 
                className="group inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-semibold bg-white text-primary-700 border-2 border-primary-200 shadow-lg hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                List Your Driveway
                <DollarSign className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
            </div>

            {/* Branding Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-3 px-6 py-3 bg-primary-900/90 backdrop-blur-sm rounded-full shadow-lg">
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent-500 text-charcoal-900 font-semibold shadow-lg shadow-accent-500/30 overflow-hidden">
                  <img 
                    src="/HeroIcon.png" 
                    alt="plekk icon" 
                    className="h-full w-full object-contain p-1.5"
                  />
                </span>
                <p className="font-medium tracking-wide text-white text-sm sm:text-base">
                  plekk — parking marketplace powered by local driveways
                </p>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent-500" />
                <span>Secure & Verified</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent-500" />
                <span>Instant Booking</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent-500" />
                <span>Protected Payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="relative py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-medium mb-6 border border-red-100">
              <AlertTriangle className="w-4 h-4 mr-2" />
              The Parking Problem
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 max-w-3xl mx-auto">
              Every day, millions of drivers waste time, fuel, and patience
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              While drivers circle endlessly, countless driveways sit empty—creating a 
              frustrating cycle that costs everyone time and money.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-red-50/50 border border-red-100">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Wasted Time</h3>
              <p className="text-gray-600">
                Drivers spend an average of 17 minutes searching for parking in busy areas
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-orange-50/50 border border-orange-100">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-6">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Increased Traffic</h3>
              <p className="text-gray-600">
                Up to 30% of urban traffic is caused by drivers searching for parking spaces
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-6">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Unnecessary Emissions</h3>
              <p className="text-gray-600">
                All that circling creates millions of tons of CO₂ emissions every year
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="relative py-24 bg-gradient-to-br from-accent-50 via-white to-mist-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(61,187,133,0.15),_transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-accent-100 text-accent-700 text-sm font-medium mb-6 border border-accent-200">
              <Sparkles className="w-4 h-4 mr-2" />
              The Plekk Solution
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto">
              Plekk fixes that
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-light">
              We turn unused driveways into bookable parking spots, so drivers go directly 
              to a guaranteed space—and homeowners earn passive income by helping their 
              community move better.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* For Drivers */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-mist-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Drivers</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Find guaranteed parking</p>
                    <p className="text-gray-600">Book a space before you arrive—no more circling</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Save time and fuel</p>
                    <p className="text-gray-600">Go directly to your reserved spot</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Secure and convenient</p>
                    <p className="text-gray-600">Verified spaces with easy booking</p>
                  </div>
                </li>
              </ul>
              <Link 
                href="/find-parking" 
                className="mt-8 inline-flex items-center text-accent-600 font-semibold hover:text-accent-700 group"
              >
                Find parking near you
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* For Homeowners */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-mist-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Homeowners</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Earn passive income</p>
                    <p className="text-gray-600">Turn your empty driveway into revenue</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Full control</p>
                    <p className="text-gray-600">Set your own prices, availability, and rules</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Help your community</p>
                    <p className="text-gray-600">Reduce traffic and emissions in your neighborhood</p>
                  </div>
                </li>
              </ul>
              <Link 
                href="/list-your-driveway" 
                className="mt-8 inline-flex items-center text-accent-600 font-semibold hover:text-accent-700 group"
              >
                Start earning today
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6 border border-primary-100">
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started is quick and easy—whether you're looking for parking or listing your space
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 shadow-lg">
              <div className="bg-accent-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-accent-500/30">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Search or List
              </h3>
              <p className="text-gray-600">
                Find parking near your destination, or list your driveway in minutes with photos and pricing
              </p>
            </div>

            <div className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 shadow-lg">
              <div className="bg-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-primary-600/30">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Book Instantly
              </h3>
              <p className="text-gray-600">
                Reserve your spot with secure payment, or receive booking requests from verified drivers
              </p>
            </div>

            <div className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-sand-50 to-white border border-sand-100 shadow-lg">
              <div className="bg-sand-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-sand-500/30">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Park or Earn
              </h3>
              <p className="text-gray-600">
                Arrive at your guaranteed space, or start earning passive income from your driveway
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 bg-gradient-to-b from-mist-50 via-white to-sand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-accent-50 text-accent-700 text-sm font-medium mb-6 border border-accent-100">
              <Shield className="w-4 h-4 mr-2" />
              Trust & Convenience
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Plekk?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for trust, designed for convenience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8" strokeWidth={1.6} />}
              title="Secure & Verified"
              description="All spaces are verified and secure. Protected payments and insurance coverage give you peace of mind."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" strokeWidth={1.6} />}
              title="Flexible Booking"
              description="Rent by the hour, day, or week. Set your own schedule and availability to fit your lifestyle."
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8" strokeWidth={1.6} />}
              title="Convenient Locations"
              description="Find parking near your destination or list your space in high-demand areas where drivers need it most."
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom,_rgba(61,187,133,0.3),_transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform parking?
          </h2>
          <p className="text-xl md:text-2xl text-primary-100 mb-10 max-w-3xl mx-auto">
            Join the movement to reduce traffic, cut emissions, and make parking work for everyone
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link 
              href="/find-parking" 
              className="group inline-flex items-center justify-center px-10 py-5 rounded-xl text-lg font-semibold bg-accent-500 text-white shadow-xl shadow-accent-500/30 hover:bg-accent-600 hover:shadow-accent-600/40 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Find Parking
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/list-your-driveway" 
              className="group inline-flex items-center justify-center px-10 py-5 rounded-xl text-lg font-semibold bg-white text-primary-900 shadow-xl hover:bg-primary-50 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              List Your Driveway
              <DollarSign className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-primary-200 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent-400" />
              <span>Secure payments protected by Stripe</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-primary-600" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent-400" />
              <span>Verified spaces and hosts</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-primary-600" />
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-accent-400" />
              <span>Reducing emissions, one spot at a time</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
