import { ContactForm } from '@/components/ContactForm'

export const metadata = {
  title: 'Contact Us | plekk',
  description: 'Reach out to the plekk team for support, partnerships, or general inquiries.',
}

export default function ContactPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact plekk</h1>
          <p className="text-gray-600">
            We&apos;re here to help. plekk is a marketplace facilitating connections between hosts and
            drivers, so operational questions about a specific space are best coordinated directly
            with your host or guest. For platform or account support, reach out using the details
            below.
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Support</h2>
          <ul className="space-y-4 text-gray-600">
            <li>
              <strong className="text-gray-900">Email:</strong>{' '}
              <a href="mailto:support@parkplekk.com" className="text-accent-600 hover:text-accent-700">
                support@parkplekk.com
              </a>
              <p className="text-sm text-gray-500 mt-1">
                We aim to respond within one business day. Include booking details if your question
                relates to an existing reservation.
              </p>
            </li>
            <li>
              <strong className="text-gray-900">Location:</strong> Halifax, Nova Scotia, Canada
              <p className="text-sm text-gray-500 mt-1">
                plekk is headquartered in Halifax and operates remotely across Canada.
              </p>
            </li>
            <li>
              <strong className="text-gray-900">Press & partnerships:</strong>{' '}
              <a href="mailto:partners@parkplekk.com" className="text-accent-600 hover:text-accent-700">
                partners@parkplekk.com
              </a>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Before you reach out</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-600">
            <li>
              Check the{' '}
              <a href="/help" className="text-accent-600 hover:text-accent-700">
                Help Center
              </a>{' '}
              for answers to common questions.
            </li>
            <li>
              Hosts and drivers should coordinate arrival instructions, access codes, and special
              considerations using plekk messaging.
            </li>
            <li>
              plekk does not provide insurance, roadside assistance, or physical property management.
              All risks, including potential damage or theft, remain with the host and the driver.
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send us a message</h2>
          <p className="text-gray-600 mb-6">
            Fill out the form below and we&apos;ll respond as soon as possible. For urgent issues,
            email us directly with &quot;URGENT&quot; in the subject line.
          </p>
          <ContactForm />
        </section>
      </div>
    </div>
  )
}

