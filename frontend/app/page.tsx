import Link from 'next/link'
import { SearchBar } from '@/components/SearchBar'
import { FeatureCard } from '@/components/FeatureCard'
import { TestimonialCard } from '@/components/TestimonialCard'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'
import { 
  Car, 
  Shield, 
  DollarSign, 
  Clock, 
  MapPin, 
  Star,
  Calendar
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Rent Driveways by the{' '}
              <span className="text-primary-600">Hour</span>
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

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose DriveMyWay?
            </h2>
            <p className="text-xl text-gray-600">
              The smartest way to find parking and earn from your driveway
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Car className="w-8 h-8" />}
              title="Secure Parking"
              description="All spaces are verified and secure with 24/7 monitoring and insurance coverage."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Flexible Hours"
              description="Rent by the hour, day, or week. Set your own schedule and availability."
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8" />}
              title="Great Value"
              description="Save up to 70% compared to traditional parking options and earn money from your space."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Trusted Community"
              description="Join thousands of verified hosts and renters in our trusted community."
            />
            <FeatureCard
              icon={<Star className="w-8 h-8" />}
              title="24/7 Support"
              description="Our support team is always here to help with any questions or issues."
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8" />}
              title="Convenient Locations"
              description="Find parking near your destination or list your space in high-demand areas."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                List Your Space
              </h3>
              <p className="text-gray-600">
                Take photos, set your price, and list your driveway in minutes
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Get Bookings
              </h3>
              <p className="text-gray-600">
                Receive booking requests and manage your availability
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Earn Money
              </h3>
              <p className="text-gray-600">
                Get paid automatically and track your earnings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
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

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of people who are already earning money from their driveways 
            or finding convenient parking solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/signup" 
              className="bg-white text-primary-600 hover:bg-gray-100 btn text-lg px-8 py-3"
            >
              Sign Up Now
            </Link>
            <Link 
              href="/find-parking" 
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 btn text-lg px-8 py-3"
            >
              Find Parking
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
} 