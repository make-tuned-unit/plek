'use client'

import { useState } from 'react'
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
  AlertTriangle,
  ChevronDown,
  HelpCircle
} from 'lucide-react'

const HeroVideo = dynamic(() => import('@/components/HeroVideo'), { ssr: false })

// Homepage: 6 most critical FAQs. More answers live on the Help Center (/help).
const FAQ_ITEMS = [
  {
    question: 'What is plekk?',
    answer: 'plekk is a parking marketplace that connects drivers who need a spot with homeowners who have space to share. You can find and book hourly or daily parking near your destination, or list your driveway and earn passive income when you’re not using it.',
  },
  {
    question: 'How do I find parking?',
    answer: 'Search by location on our Find Parking page, choose a date and time, then book a space. You’ll see photos, price, and access instructions. Payment is secure and you get a guaranteed spot—no more circling the block.',
  },
  {
    question: 'How do I list my driveway?',
    answer: 'Go to List Your Driveway, add your address, upload photos, set your hourly or daily rate, and choose when your space is available. Once your listing is approved, drivers can book and you’ll receive payouts to your connected account.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Drivers pay the host’s rate plus a small service fee. Hosts set their own prices and receive payouts minus a platform fee. There are no monthly fees to list—you only pay when you earn.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Yes. All payments are processed securely through Stripe. Your card details are never stored on our servers, and both drivers and hosts are protected by our payment and cancellation policies.',
  },
  {
    question: 'What is your refund policy?',
    answer: 'If a booking is cancelled at least 24 hours before the start time, plekk automatically issues a full refund. For cancellations within 24 hours of the start time, refunds are at the host’s discretion—hosts can choose to issue a full refund, partial refund, or no refund from their Payments tab. See our Help Center for more details.',
  },
]

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}
const slideUpTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
const viewport = { once: true, amount: 0.2 }
const stagger = { staggerChildren: 0.12, delayChildren: 0.1 }

export default function HomePage() {
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 to-sand-100">
      {/* Hero Section - fixed height so video fills; dark bg hides any letterboxing */}
      <section className="relative overflow-hidden min-h-[70vh] max-h-[95vh] h-[85vh] flex flex-col bg-neutral-900">
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
            <motion.h1 variants={slideUp} transition={slideUpTransition} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-charcoal-50 mb-6 md:mb-8 leading-tight tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
              Finding parking shouldn't{' '}
              <span className="text-accent-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">mean circling the block</span>
            </motion.h1>
            
            <motion.div variants={slideUp} transition={slideUpTransition} className="hidden md:block max-w-2xl mx-auto mb-6 md:mb-8">
              <SearchBar />
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row gap-4 justify-center mb-6 md:mb-8">
              <Link 
                href="/find-parking" 
                className="group inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl text-lg font-bold bg-gradient-accent text-white shadow-xl shadow-accent-500/40 hover:shadow-accent-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Find Parking
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link 
                href="/list-your-driveway" 
                className="group inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl text-lg font-bold bg-white text-charcoal-900 border-2 border-mist-300 shadow-md hover:bg-mist-50 hover:border-accent-300 hover:text-accent-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
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
      <section className="relative py-16 lg:py-24 bg-white">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <div className="text-center mb-12 lg:mb-16">
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-medium mb-6 border border-red-100">
              <AlertTriangle className="w-4 h-4 mr-2" />
              The Parking Problem
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 max-w-3xl mx-auto tracking-tight">
              Every day, millions of drivers waste time, fuel, and patience
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl text-charcoal-600 max-w-3xl mx-auto leading-relaxed">
              While drivers circle endlessly, countless driveways sit empty—creating a
              frustrating cycle that costs everyone time and money.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-6 sm:p-8 rounded-2xl bg-red-50/60 border border-red-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-100 text-red-600 mb-5 shadow-sm">
                <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-2 tracking-tight">Wasted Time</h3>
              <p className="text-charcoal-600 text-sm sm:text-base leading-relaxed">
                Drivers spend an average of 17 minutes searching for parking in busy areas
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-6 sm:p-8 rounded-2xl bg-orange-50/60 border border-orange-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 text-orange-600 mb-5 shadow-sm">
                <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-2 tracking-tight">Increased Traffic</h3>
              <p className="text-charcoal-600 text-sm sm:text-base leading-relaxed">
                Up to 30% of urban traffic is caused by drivers searching for parking spaces
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center p-6 sm:p-8 rounded-2xl bg-amber-50/60 border border-amber-100 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-100 text-amber-600 mb-5 shadow-sm">
                <Leaf className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-2 tracking-tight">Unnecessary Emissions</h3>
              <p className="text-charcoal-600 text-sm sm:text-base leading-relaxed">
                All that circling creates millions of tons of CO₂ emissions every year
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Solution Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-br from-accent-50 via-white to-mist-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(61,187,133,0.15),_transparent_70%)] pointer-events-none" />
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <div className="text-center mb-12 lg:mb-16">
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-accent-100 text-accent-700 text-sm font-medium mb-6 border border-accent-200">
              <Sparkles className="w-4 h-4 mr-2" />
              The plekk Solution
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 max-w-4xl mx-auto tracking-tight">
              plekk fixes that
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl md:text-2xl text-charcoal-700 max-w-4xl mx-auto leading-relaxed font-light">
              We turn unused driveways into bookable parking spots, so drivers go directly
              to a guaranteed space—and homeowners earn passive income by helping their
              community move better.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* For Drivers */}
            <motion.div variants={slideUp} transition={slideUpTransition} className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg border border-mist-200 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-md shadow-accent-500/30">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">For Drivers</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Find guaranteed parking</p>
                    <p className="text-charcoal-600">Book a space before you arrive—no more circling</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Save time and fuel</p>
                    <p className="text-charcoal-600">Go directly to your reserved spot</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Secure and convenient</p>
                    <p className="text-charcoal-600">Verified spaces with easy booking</p>
                  </div>
                </li>
              </ul>
              <Link 
                href="/find-parking" 
                className="mt-6 sm:mt-8 inline-flex items-center text-base font-semibold text-accent-600 hover:text-accent-700 group"
              >
                Find parking near you
                <ArrowRight className="ml-1.5 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* For Homeowners */}
            <motion.div variants={slideUp} transition={slideUpTransition} className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg border border-mist-200 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md shadow-primary-600/30">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">For Homeowners</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Earn passive income</p>
                    <p className="text-charcoal-600">Turn your empty driveway into revenue</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Full control</p>
                    <p className="text-charcoal-600">Set your own prices, availability, and rules</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-charcoal-900">Help your community</p>
                    <p className="text-charcoal-600">Reduce traffic and emissions in your neighbourhood</p>
                  </div>
                </li>
              </ul>
              <Link 
                href="/list-your-driveway" 
                className="mt-6 sm:mt-8 inline-flex items-center text-base font-semibold text-accent-600 hover:text-accent-700 group"
              >
                Start earning today
                <ArrowRight className="ml-1.5 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-16 lg:py-24 bg-white">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <div className="text-center mb-12 lg:mb-16">
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6 border border-primary-100">
              Simple Process
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 tracking-tight">
              How It Works
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl text-charcoal-600 max-w-2xl mx-auto">
              Getting started is quick and easy—whether you're looking for parking or listing your space
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-5 sm:px-6 py-6 sm:py-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-accent-500 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-md shadow-accent-500/30">
                <span className="text-xl sm:text-2xl font-bold">1</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900 mb-2 tracking-tight">
                Search or List
              </h3>
              <p className="text-charcoal-600 text-sm sm:text-base">
                Find parking near your destination, or list your driveway in minutes with photos and pricing
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-5 sm:px-6 py-6 sm:py-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-primary-600 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-md shadow-primary-600/30">
                <span className="text-xl sm:text-2xl font-bold">2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900 mb-2 tracking-tight">
                Book Instantly
              </h3>
              <p className="text-charcoal-600 text-sm sm:text-base">
                Reserve your spot with secure payment, or receive booking requests from verified drivers
              </p>
            </motion.div>

            <motion.div variants={slideUp} transition={slideUpTransition} className="text-center px-5 sm:px-6 py-6 sm:py-8 rounded-2xl bg-gradient-to-br from-sand-50 to-white border border-sand-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-sand-500 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-md shadow-sand-500/30">
                <span className="text-xl sm:text-2xl font-bold">3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal-900 mb-2 tracking-tight">
                Park or Earn
              </h3>
              <p className="text-charcoal-600 text-sm sm:text-base">
                Arrive at your guaranteed space, or start earning passive income from your driveway
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-mist-50 via-white to-sand-50">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <div className="text-center mb-12 lg:mb-16">
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-accent-50 text-accent-700 text-sm font-medium mb-6 border border-accent-100">
              <Shield className="w-4 h-4 mr-2" />
              Trust & Convenience
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 tracking-tight">
              Why Choose plekk?
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl text-charcoal-600 max-w-2xl mx-auto">
              Built for trust, designed for convenience
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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
          </div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-16 lg:py-24 bg-white">
        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <div className="text-center mb-10 lg:mb-12">
            <motion.span variants={slideUp} transition={slideUpTransition} className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6 border border-primary-100">
              <HelpCircle className="w-4 h-4 mr-2" />
              FAQ
            </motion.span>
            <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal-900 mb-4 tracking-tight">
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl text-charcoal-600">
              Common questions about finding parking and listing your driveway
            </motion.p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <motion.div
                key={index}
                variants={slideUp}
                transition={slideUpTransition}
                className="rounded-2xl border border-mist-200 bg-mist-50 overflow-hidden hover:border-accent-200 hover:shadow-md transition-all"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(faqOpenIndex === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-charcoal-900 hover:bg-accent-50/50 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 text-charcoal-500 transition-transform duration-200 ${
                      faqOpenIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ${
                    faqOpenIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 pt-0 text-charcoal-600 leading-relaxed border-t border-mist-200">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={slideUp} transition={slideUpTransition} className="mt-10 text-center">
            <p className="text-charcoal-600 mb-4">More answers in the Help Center</p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <Link
                href="/help"
                className="inline-flex items-center text-accent-600 font-semibold hover:text-accent-700"
              >
                Help Center
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center text-charcoal-600 font-medium hover:text-charcoal-900"
              >
                Contact us
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom,_rgba(61,187,133,0.3),_transparent_70%)] pointer-events-none" />
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={{ visible: { transition: stagger } }}
        >
          <motion.h2 variants={slideUp} transition={slideUpTransition} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Ready to transform parking?
          </motion.h2>
          <motion.p variants={slideUp} transition={slideUpTransition} className="text-lg sm:text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
            Join the movement to reduce traffic, cut emissions, and make parking work for everyone
          </motion.p>
          <motion.div variants={slideUp} transition={slideUpTransition} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link 
              href="/find-parking" 
              className="group inline-flex items-center justify-center min-h-[52px] px-8 sm:px-10 py-4 sm:py-5 rounded-xl text-lg font-bold bg-gradient-accent text-white shadow-xl shadow-accent-500/40 hover:shadow-accent-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Find Parking
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              href="/list-your-driveway" 
              className="group inline-flex items-center justify-center min-h-[52px] px-8 sm:px-10 py-4 sm:py-5 rounded-xl text-lg font-bold bg-white text-primary-900 border-2 border-white/30 shadow-lg hover:bg-mist-50 hover:border-accent-300 hover:text-accent-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
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
