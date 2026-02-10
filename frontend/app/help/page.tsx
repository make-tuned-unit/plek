import Link from 'next/link'
import {
  HelpCircle,
  BookOpen,
  CreditCard,
  Clock,
  MapPin,
  Shield,
  MessageSquare,
  Users,
  Eye,
  AlertTriangle,
} from 'lucide-react'

export const metadata = {
  title: 'Help Center | plekk',
  description: 'Get answers to common questions about using plekk as a host or driver.',
}

const faqs = [
  {
    question: 'What is plekk?',
    answer:
      'plekk is a marketplace that connects drivers looking for parking with hosts who have available driveways or private spaces. We facilitate the connection and booking process but do not operate or manage the parking spaces ourselves.',
    icon: HelpCircle,
  },
  {
    question: 'How do bookings work?',
    answer:
      'Drivers can search for nearby spaces, review availability, and complete bookings through plekk. Hosts confirm the reservation and provide arrival instructions. Payment is handled securely through our platform and passed along to the host after the stay.',
    icon: BookOpen,
  },
  {
    question: 'Refunds and cancellations',
    answer:
      'plekk automatically issues a full refund when a booking is cancelled at least 24 hours before the start time. For cancellations within 24 hours of the start time, it is at the host\u2019s discretion whether to issue a full refund, partial refund, or no refund\u2014there is no obligation under the plekk platform. Hosts manage refund decisions (full, partial, or decline) from Profile \u2192 Payments \u2192 Refunds. As a driver, review each listing\u2019s details before booking; if you cancel, the host may or may not offer a refund depending on timing and their choice.',
    icon: CreditCard,
  },
  {
    question: 'Can I book by the hour or by the day?',
    answer:
      'Yes. Many spaces offer both hourly and daily parking. When you search, you\u2019ll see the options and prices so you can choose what fits your needs.',
    icon: Clock,
  },
  {
    question: 'How do hosts get paid?',
    answer:
      'Hosts connect a Stripe account to receive payouts. After a booking is completed, earnings are transferred according to the payout schedule. Hosts can track earnings and manage refunds in Profile \u2192 Payments.',
    icon: CreditCard,
  },
  {
    question: 'What if I need to cancel?',
    answer:
      'Cancellation policies depend on how close to the booking start time you cancel. You can view the specific policy for each listing before you book. If you cancel at least 24 hours before start, you receive a full refund automatically; within 24 hours, any refund is at the host\u2019s discretion.',
    icon: Clock,
  },
  {
    question: 'Where is plekk available?',
    answer:
      'plekk is available in supported regions where hosts have listed spaces. Search by city or address on the Find Parking page to see availability near you.',
    icon: MapPin,
  },
  {
    question: 'How are spaces verified?',
    answer:
      'Listings are reviewed to ensure they\u2019re real, accurately described, and meet our standards. We also use secure payments and reviews to help keep the marketplace safe for everyone.',
    icon: Shield,
  },
  {
    question: 'Who is responsible for the vehicle while parked?',
    answer:
      'Hosts and drivers are responsible for ensuring the space is safe and the vehicle is secure. plekk does not provide insurance or accept liability for damage, theft, or disputes between users.',
    icon: Users,
  },
  {
    question: 'How can I contact support?',
    answer:
      'You can reach us at support@parkplekk.com. We typically respond within one business day.',
    icon: MessageSquare,
  },
]

const safetyItems = [
  {
    title: 'Inspect the space',
    description:
      'Hosts should keep their space well maintained, and drivers should inspect the area before leaving their vehicle.',
    icon: Eye,
  },
  {
    title: 'Document condition',
    description:
      'Both parties should document the state of the vehicle and parking area at check-in and checkout to help settle any disputes.',
    icon: Shield,
  },
  {
    title: 'Communicate clearly',
    description:
      'Use plekk messaging to share arrival instructions, access details, and any special considerations. Keep all communication within the platform.',
    icon: MessageSquare,
  },
  {
    title: 'Understand the risks',
    description:
      'plekk does not provide insurance or guarantee the condition of vehicles or spaces. Hosts and drivers assume all risks related to bookings, including damage or theft.',
    icon: AlertTriangle,
  },
]

export default function HelpPage() {
  return (
    <div className="bg-mist-100 min-h-screen">
      {/* Hero header */}
      <div className="bg-white border-b border-mist-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent-100 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-accent-700" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900 tracking-tight">Help Center</h1>
          </div>
          <p className="text-charcoal-600 max-w-3xl text-base sm:text-lg">
            Need a hand? We&apos;ve gathered the most common questions about using plekk as a
            driver or host. plekk is a marketplace that connects people with parking spaces, and
            all activities and liabilities remain between the users involved.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* FAQ grid */}
        <section className="grid gap-4 sm:gap-5 md:grid-cols-2 mb-12 sm:mb-16">
          {faqs.map((faq) => {
            const Icon = faq.icon
            return (
              <article key={faq.question} className="bg-white rounded-xl shadow-sm border border-mist-200 p-5 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-accent-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-charcoal-900">{faq.question}</h2>
                </div>
                <p className="text-charcoal-600 leading-relaxed text-sm sm:text-base pl-11">{faq.answer}</p>
              </article>
            )
          })}
        </section>

        {/* Still need help */}
        <section className="bg-white rounded-xl shadow-sm border border-mist-200 p-6 sm:p-8 mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-semibold text-charcoal-900 mb-3">Still need help?</h2>
          <p className="text-charcoal-600 mb-6 text-sm sm:text-base">
            Our support team is happy to answer questions about your account, listings, or bookings.
            plekk does not provide emergency roadside assistance — in urgent situations, contact local
            authorities.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Link
              href="mailto:support@parkplekk.com"
              className="inline-flex items-center justify-center min-h-[48px] rounded-xl bg-accent-500 px-5 py-3 text-white font-semibold hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/25"
            >
              Email support@parkplekk.com
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center min-h-[48px] rounded-xl border border-mist-300 px-5 py-3 text-charcoal-700 font-semibold hover:bg-mist-50 transition-colors"
            >
              Visit Contact Us
            </Link>
          </div>
        </section>

        {/* Safety reminders */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-charcoal-900 mb-5">Safety reminders</h2>
          <ul className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {safetyItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="bg-white rounded-xl shadow-sm border border-mist-200 p-5 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-charcoal-900">{item.title}</h3>
                  </div>
                  <p className="text-charcoal-600 text-sm sm:text-base pl-11">
                    {item.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
