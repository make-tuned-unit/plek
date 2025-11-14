import Link from 'next/link'

export const metadata = {
  title: 'Help Center | plekk',
  description: 'Get answers to common questions about using plekk as a host or driver.',
}

const faqs = [
  {
    question: 'What is plekk?',
    answer:
      'plekk is a marketplace that connects drivers looking for parking with hosts who have available driveways or private spaces. We facilitate the connection and booking process but do not operate or manage the parking spaces ourselves.',
  },
  {
    question: 'How do bookings work?',
    answer:
      'Drivers can search for nearby spaces, review availability, and complete bookings through plekk. Hosts confirm the reservation and provide arrival instructions. Payment is handled securely through our platform and passed along to the host after the stay.',
  },
  {
    question: 'Who is responsible for the vehicle while parked?',
    answer:
      'Hosts and drivers are responsible for ensuring the space is safe and the vehicle is secure. plekk does not provide insurance or accept liability for damage, theft, or disputes between users.',
  },
  {
    question: 'How can I contact support?',
    answer:
      'You can reach us at support@plekk.com. We typically respond within one business day.',
  },
  {
    question: 'Can I cancel a booking?',
    answer:
      'Each listing includes a cancellation policy defined by the host. Review the policy before booking and contact the host directly through the messaging tools for any changes.',
  },
]

export default function HelpPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-gray-600 max-w-3xl">
            Need a hand? We&apos;ve gathered the most common questions about using plekk as a
            driver or host. plekk is a marketplace that connects people with parking spaces, and
            all activities and liabilities remain between the users involved.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {faqs.map((faq) => (
            <article key={faq.question} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h2>
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Still need help?</h2>
          <p className="text-gray-600 mb-6">
            Our support team is happy to answer questions about your account, listings, or bookings.
            plekk does not provide emergency roadside assistance—in urgent situations, contact local
            authorities.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
            <Link
              href="mailto:support@plekk.com"
              className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-5 py-3 text-white font-medium hover:bg-accent-600 transition"
            >
              Email support@plekk.com
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-gray-700 font-medium hover:bg-gray-100 transition"
            >
              Visit Contact Us
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Safety reminders</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Inspect the space</h3>
              <p className="text-gray-600">
                Hosts should keep their space well maintained, and drivers should inspect the area
                before leaving their vehicle.
              </p>
            </li>
            <li className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Document condition</h3>
              <p className="text-gray-600">
                Both parties should document the state of the vehicle and parking area at check-in
                and checkout to help settle any disputes.
              </p>
            </li>
            <li className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Communicate clearly</h3>
              <p className="text-gray-600">
                Use plekk messaging to share arrival instructions, access details, and any special
                considerations. Keep all communication within the platform.
              </p>
            </li>
            <li className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Understand the risks</h3>
              <p className="text-gray-600">
                plekk does not provide insurance or guarantee the condition of vehicles or spaces.
                Hosts and drivers assume all risks related to bookings, including damage or theft.
              </p>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

