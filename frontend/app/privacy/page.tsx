export const metadata = {
  title: 'Privacy Policy | plekk',
  description: 'Learn how plekk collects, uses, and protects your information.',
}

const sections = [
  {
    title: '1. Introduction',
    content:
      'plekk Technologies Inc. (“plekk”, “we”, “us”, or “our”) operates a marketplace connecting hosts offering parking spaces with drivers seeking parking. This Privacy Policy explains how we collect, use, and share your information when you use plekk. By accessing plekk, you consent to this policy.',
  },
  {
    title: '2. Information We Collect',
    content:
      'We collect information you provide directly, such as your name, email address, phone number, profile details, payment information, and communications sent through the platform. We also collect information automatically, including device identifiers, log data, approximate location, and usage analytics. If you connect third-party services (e.g., Stripe, Mapbox), we may receive information consistent with their privacy policies.',
  },
  {
    title: '3. How We Use Information',
    content:
      'We use your information to operate and improve the plekk marketplace, facilitate bookings and payments, provide customer support, personalize experiences, send transactional emails, and enforce our Terms of Service. We may use aggregated or de-identified data for analytics and product development.',
  },
  {
    title: '4. Sharing & Disclosure',
    content:
      'plekk shares information with other users as needed to facilitate bookings (e.g., host contact details shared with drivers). We share information with service providers such as payment processors, email providers, analytics tools, and customer support platforms. plekk may disclose information if required by law, to enforce our policies, or to protect our rights, users, or the public.',
  },
  {
    title: '5. Marketplace Liability Reminder',
    content:
      'plekk is a technology platform only. We do not insure vehicles or spaces, and we do not provide physical parking services. Any personal or property damage, theft, or disputes arising from a booking are the sole responsibility of the host and driver. Users should maintain appropriate insurance coverage and resolve issues directly with each other.',
  },
  {
    title: '6. Cookies & Tracking Technologies',
    content:
      'We use cookies and similar technologies to remember preferences, keep you signed in, and analyze site performance. You can control cookies through your browser settings, but disabling them may impact your experience.',
  },
  {
    title: '7. Data Retention',
    content:
      'plekk retains personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce agreements. We may also retain anonymized data for legitimate business purposes.',
  },
  {
    title: '8. Security',
    content:
      'We implement administrative, technical, and physical safeguards to protect your information. However, no system is entirely secure, and we cannot guarantee absolute security. Users should maintain strong passwords and notify us immediately of any suspected unauthorized access.',
  },
  {
    title: '9. Your Choices',
    content:
      'You can update your account information, manage notification preferences, or request account deletion by contacting support@parkplekk.com. You may opt out of promotional communications by following the unsubscribe instructions in our emails.',
  },
  {
    title: '10. Children\'s Privacy',
    content:
      'plekk is not intended for individuals under 18. We do not knowingly collect personal information from children. If we learn that a minor has provided personal data, we will delete it promptly.',
  },
  {
    title: '11. International Users',
    content:
      'plekk is operated from Canada. If you access plekk from outside Canada, you consent to the transfer and storage of your information in Canada and other jurisdictions where our service providers are located.',
  },
  {
    title: '12. Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. Updated versions will be posted on this page with a revised effective date. Continued use of plekk constitutes acceptance of the updated policy.',
  },
  {
    title: '13. Contact Us',
    content:
      'If you have questions or concerns about this Privacy Policy, contact us at privacy@parkplekk.com or write to plekk Technologies Inc., Halifax, Nova Scotia, Canada.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="bg-mist-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-charcoal-900 mb-3">plekk Privacy Policy</h1>
          <p className="text-charcoal-600">
            Effective date: November 10, 2025. plekk is committed to protecting your privacy while
            providing a marketplace that connects hosts and drivers. This policy explains our data
            practices.
          </p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="bg-white rounded-xl shadow-sm border border-charcoal-100 p-6">
              <h2 className="text-xl font-semibold text-charcoal-900 mb-3">{section.title}</h2>
              <p className="text-charcoal-600 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>

        <p className="text-sm text-charcoal-500 mt-10">
          plekk is a marketplace and does not oversee parking spaces or vehicles. Protect your
          personal information and physical property when interacting with other users, and contact us
          immediately if you suspect unauthorized activity on your account.
        </p>
      </div>
    </div>
  )
}




