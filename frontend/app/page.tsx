'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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

const slideUp = {
  hidden: { y: 32, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}
const slideUpTransition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
const viewport = { once: true, amount: 0.12 }
const stagger = { staggerChildren: 0.08, delayChildren: 0.06 }

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100">
      {/* Hero Section - fixed height so video fills without letterboxing */}
      <section className="relative overflow-hidden min-h-[70vh] max-h-[95vh] h-[85vh] flex flex-col">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/35 to-black/25 backdrop-blur-sm pointer-events-none" />
        {/* Header fade for readability over video */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
        <div className="relative flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: stagger } }}
          >
            <motion.h1 variants={slideUp} transition={slideUpTransition} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-50 mb-6 md:mb-8 leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
              Finding parking shouldn't{' '}
              <span className="text-accent-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">mean circling the block</span>
            </motion.h1>
            
            <motion.div variants={slideUp} transition={slideUpTransition} className="hidden md:block max-w-2xl mx-auto mb-6 md:mb-8">
              <SearchBar />
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 md:mb-8">
              <Link 
                href="/find-parking" 
                className="group inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-bold bg-gradient-accent text-white shadow-xl shadow-accent-500/40 hover:shadow-accent-lg hover:-translate-y-1 transition-all duration-300"
              >
                Find Parking
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link 
                href="/list-your-driveway" 
                className="group inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-bold bg-white text-charcoal-900 border-2 border-mist-300 shadow-lg hover:bg-mist-50 hover:border-accent-300 hover:text-accent-700 hover:-translate-y-1 transition-all duration-300"
              >
                List Your Driveway
                <DollarSign className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              </Link>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-5 md:mb-6">
              <div className="flex items-center gap-3 px-6 py-3 bg-primary-900/95 backdrop-blur-md rounded-full shadow-xl border border-white/10 hover:shadow-2xl transition-all duration-300">
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-accent text-charcoal-900 font-semibold shadow-lg shadow-accent-500/40 overflow-hidden">
                  <img 
                    src="/HeroIcon.png" 
                    alt="plekk icon" 
                    className="h-full w-full object-contain p-1.5"
                  />
                </span>
                <p className="font-semibold tracking-wide text-white text-sm sm:text-base">
                  plekk — parking marketplace powered by local driveways
                </p>
              </div>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-white/20 hover:shadow-lg transition-all duration-200">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                <span className="font-semibold text-charcoal-800">Secure & Verified</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/30" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-white/20 hover:shadow-lg transition-all duration-200">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                <span className="font-semibold text-charcoal-800">Instant Booking</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/30" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-white/20 hover:shadow-lg transition-all duration-200">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                <span className="font-semibold text-charcoal-800">Protected Payments</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="relative py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-medium mb-6 border border-red-100">
              <AlertTriangle className="w-4 h-4 mr-2" />
              The Parking Problem
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 max-w-3xl mx-auto">
              Every day, millions of drivers waste time, fuel, and patience
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              While drivers circle endlessly, countless driveways sit empty—creating a 
              frustrating cycle that costs everyone time and money.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-8 rounded-2xl bg-red-50/60 border border-red-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-6 shadow-md">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Wasted Time</h3>
              <p className="text-gray-600 leading-relaxed">
                Drivers spend an average of 17 minutes searching for parking in busy areas
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-8 rounded-2xl bg-orange-50/60 border border-orange-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 mb-6 shadow-md">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Increased Traffic</h3>
              <p className="text-gray-600 leading-relaxed">
                Up to 30% of urban traffic is caused by drivers searching for parking spaces
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-8 rounded-2xl bg-amber-50/60 border border-amber-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mb-6 shadow-md">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Unnecessary Emissions</h3>
              <p className="text-gray-600 leading-relaxed">
                All that circling creates millions of tons of CO₂ emissions every year
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="relative py-24 bg-gradient-to-br from-accent-50 via-white to-mist-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(61,187,133,0.15),_transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-accent-100 text-accent-700 text-sm font-medium mb-6 border border-accent-200">
              <Sparkles className="w-4 h-4 mr-2" />
              The plekk Solution
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto">
              plekk fixes that
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-light">
              We turn unused driveways into bookable parking spots, so drivers go directly 
              to a guaranteed space—and homeowners earn passive income by helping their 
              community move better.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            {/* For Drivers */}
            <motion.div variants={slideUp} transition={slideUpTransition} className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-mist-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent-500/30">
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
            </motion.div>

            {/* For Homeowners */}
            <motion.div variants={slideUp} transition={slideUpTransition} className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-mist-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary-600/30">
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
                    <p className="text-gray-600">Reduce traffic and emissions in your neighbourhood</p>
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6 border border-primary-100">
              Simple Process
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started is quick and easy—whether you're looking for parking or listing your space
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 shadow-lg">
              <div className="bg-accent-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-accent-500/30">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Search or List
              </h3>
              <p className="text-gray-600">
                Find parking near your destination, or list your driveway in minutes with photos and pricing
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 shadow-lg">
              <div className="bg-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-primary-600/30">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Book Instantly
              </h3>
              <p className="text-gray-600">
                Reserve your spot with secure payment, or receive booking requests from verified drivers
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-6 py-8 rounded-2xl bg-gradient-to-br from-sand-50 to-white border border-sand-100 shadow-lg">
              <div className="bg-sand-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-sand-500/30">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Park or Earn
              </h3>
              <p className="text-gray-600">
                Arrive at your guaranteed space, or start earning passive income from your driveway
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 bg-gradient-to-b from-mist-50 via-white to-sand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-accent-50 text-accent-700 text-sm font-medium mb-6 border border-accent-100">
              <Shield className="w-4 h-4 mr-2" />
              Trust & Convenience
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose plekk?
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for trust, designed for convenience
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={{ visible: { transition: stagger } }}
          >
            <motion.div variants={slideUp} transition={slideUpTransition}>
              <FeatureCard
                icon={<Shield className="w-8 h-8" strokeWidth={1.6} />}
                title="Secure & Verified"
                description="All spaces are verified and secure. Protected payments give you peace of mind."
              />
            </motion.div>
            <motion.div variants={slideUp} transition={slideUpTransition}>
              <FeatureCard
                icon={<Clock className="w-8 h-8" strokeWidth={1.6} />}
                title="Flexible Booking"
                description="Rent by the hour, day, or week. Set your own schedule and availability to fit your lifestyle."
              />
            </motion.div>
            <motion.div variants={slideUp} transition={slideUpTransition}>
              <FeatureCard
                icon={<MapPin className="w-8 h-8" strokeWidth={1.6} />}
                title="Convenient Locations"
                description="Find parking near your destination or list your space in high-demand areas where drivers need it most."
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom,_rgba(61,187,133,0.3),_transparent_70%)] pointer-events-none" />
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform parking?
          </motion.h2>
          <motion.p variants={slideUp} transition={slideUpTransition} className="text-xl md:text-2xl text-primary-100 mb-10 max-w-3xl mx-auto">
            Join the movement to reduce traffic, cut emissions, and make parking work for everyone
          </motion.p>
          <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link 
              href="/find-parking" 
              className="group inline-flex items-center justify-center px-10 py-5 rounded-xl text-lg font-bold bg-gradient-accent text-white shadow-xl shadow-accent-500/40 hover:shadow-accent-lg hover:-translate-y-1 transition-all duration-300"
            >
              Find Parking
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              href="/list-your-driveway" 
              className="group inline-flex items-center justify-center px-10 py-5 rounded-xl text-lg font-bold bg-white text-primary-900 border-2 border-mist-300 shadow-xl hover:bg-mist-50 hover:border-accent-300 hover:text-accent-700 hover:-translate-y-1 transition-all duration-300"
            >
              List Your Driveway
              <DollarSign className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </Link>
          </motion.div>
          <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row items-center justify-center gap-6 text-primary-200 text-sm">
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
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
// Force rebuild
