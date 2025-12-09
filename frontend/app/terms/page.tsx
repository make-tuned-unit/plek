export const metadata = {
  title: 'Terms of Service | plekk',
  description: 'Review the terms that govern your use of plekk as a host or driver.',
}

const sections = [
  {
    title: '1. Overview',
    content:
      'plekk operates a marketplace platform that connects drivers seeking short-term parking with hosts offering private parking spaces. plekk does not own, manage, control, or insure the spaces listed on the platform. By using plekk, you agree that your relationship for any booking is solely between the host and the driver.',
  },
  {
    title: '2. Eligibility',
    content:
      'You must be at least 18 years old and capable of entering into legally binding agreements to use plekk. Hosts must have the right to offer their space and must comply with all applicable laws, regulations, permits, and homeowners or condominium rules.',
  },
  {
    title: '3. Marketplace Role & Liability',
    content:
      'plekk provides technology and payment tools to facilitate bookings but does not provide parking services. All risks, including vehicle damage, theft, injury, citations, or other losses, rest entirely with the host and the driver. plekk is not a party to the contract between users and disclaims all liability arising from interactions, use of a space, or disputes between users.',
  },
  {
    title: '4. User Responsibilities',
    content:
      'Hosts must keep their spaces safe, accurately described, and accessible. Drivers must use the space responsibly, comply with host rules, and observe local laws. Users agree to communicate promptly, resolve disputes in good faith, and provide accurate information.',
  },
  {
    title: '5. Fees & Payments',
    content:
      'plekk charges a total service fee equal to 10% of each confirmed booking: renters pay a 5% fee that is added to their checkout total, and hosts pay a 5% fee that is deducted from their earnings before payout. Fees, payout schedules, and cancellation policies are shown during booking or listing creation. plekk may withhold payouts if required to resolve disputes, comply with law, or prevent fraud.',
  },
  {
    title: '6. Cancellations & Refunds',
    content:
      'Cancellation terms are defined by the host for each listing. Drivers should review the policy before booking. plekk processes refunds according to the applicable policy and is not responsible for any costs beyond the amounts processed through the platform.',
  },
  {
    title: '7. Risk Allocation',
    content:
      'plekk does not provide insurance, roadside assistance, or guarantees regarding listed spaces. By using the platform, you acknowledge that plekk is not liable for any property damage, vehicle theft, personal injury, fines, or legal claims arising from a booking. All risks rest entirely with the host and the driver.',
  },
  {
    title: '8. Prohibited Activities',
    content:
      'Users may not use plekk for unlawful activities, misrepresent listings, bypass the platform for payment, damage property, or interfere with other users. plekk reserves the right to suspend or terminate accounts that violate these terms or pose risk to the community.',
  },
  {
    title: '9. Disclaimers & Limitation of Liability',
    content:
      'plekk provides the platform “as is” without warranties of any kind. To the maximum extent permitted by law, plekk will not be liable for indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, or goodwill. plekk’s total liability for any claim will not exceed the amount of fees you paid to plekk in the twelve months preceding the claim.',
  },
  {
    title: '10. Indemnification',
    content:
      'You agree to indemnify and hold plekk, its officers, directors, employees, and agents harmless from any claims, damages, losses, and expenses (including legal fees) arising out of your use of the platform, your interactions with other users, or your breach of these terms.',
  },
  {
    title: '11. Modifications',
    content:
      'plekk may modify these Terms of Service at any time. We will post updated terms with a new effective date. Continued use of the platform after changes become effective constitutes acceptance of the revised terms.',
  },
  {
    title: '12. Governing Law & Dispute Resolution',
    content:
      'These terms are governed by the laws of Nova Scotia, Canada, without regard to conflict of laws principles. Users agree to resolve disputes through binding arbitration or in the courts located in Halifax, Nova Scotia, unless prohibited by applicable law.',
  },
  {
    title: '13. Contact',
    content:
      'Questions about these terms can be sent to support@plekk.com. We encourage users to resolve disputes directly but can assist with guidance related to the platform.',
  },
]

export default function TermsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">plekk Terms of Service</h1>
          <p className="text-gray-600">
            Effective date: November 10, 2025. These Terms of Service describe the agreement between
            plekk Technologies Inc. (&quot;plekk&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) and users of the plekk
            marketplace platform. By accessing or using plekk, you agree to these terms.
          </p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-10">
          If you do not agree to these Terms of Service, you must stop using plekk immediately. By
          continuing to use the platform, you confirm that you understand plekk acts solely as a
          matchmaking marketplace and that all liability related to parking transactions, including
          damage, theft, or fines, rests with the host and the driver.
        </p>
      </div>
    </div>
  )
}

