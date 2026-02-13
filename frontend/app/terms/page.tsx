export const metadata = {
  title: 'Terms of Service | plekk',
  description: 'Review the terms that govern your use of plekk as a host or driver.',
}

type Section = {
  title: string
  paragraphs: string[]
  items?: string[]
}

const sections: Section[] = [
  {
    title: '1. Overview',
    paragraphs: [
      'plekk operates an online marketplace that connects people seeking short-term parking ("Drivers") with individuals offering private parking spaces ("Hosts").',
      'plekk does not own, lease, manage, control, or insure any parking space listed on the platform, and does not provide parking, valet, or vehicle storage services.',
      'When a booking is made through plekk, plekk\u2019s role is limited to facilitating the listing, booking, and payment process. The parking arrangement itself is between the Host and the Driver, subject to the listing details, host rules, and these Terms.',
    ],
  },
  {
    title: '2. Eligibility',
    paragraphs: [
      'You must be at least 18 years old, capable, and legally able to enter into binding agreements to create an account or use plekk.',
      'If you list a parking space as a Host, you represent and warrant that you have the legal right to offer the space and that your listing and use of the space comply with all applicable laws, bylaws, regulations, permits, lease terms, and any homeowners\u2019 association or condominium rules.',
      'Hosts are responsible for ensuring ongoing compliance and for promptly updating or removing a listing if their right to offer the space changes.',
      'plekk does not verify a Host\u2019s right to offer a space and relies on the Host\u2019s representations.',
    ],
  },
  {
    title: '3. Marketplace Role & Liability',
    paragraphs: [
      'plekk provides an online platform, including technology and payment tools, to help Hosts and Drivers connect and arrange bookings. plekk does not provide parking, vehicle storage, or supervision services and does not take custody of vehicles.',
      'Except to the extent required by applicable law, Hosts and Drivers assume responsibility for risks arising from the use of a parking space, including vehicle damage, theft, personal injury, citations, or other losses related to the parking arrangement.',
      'plekk is not responsible for the physical condition, safety, legality, or availability of any space and is not responsible for the actions or omissions of Hosts or Drivers. While plekk facilitates bookings and payments, the parking arrangement itself is between the Host and the Driver, subject to the listing details, host rules, and these Terms.',
    ],
  },
  {
    title: '4. User Responsibilities',
    paragraphs: [
      'Hosts are responsible for ensuring that their listed spaces are accurately described, reasonably accessible as described in the listing, and maintained in a condition suitable for the intended use. Hosts are responsible for disclosing any material restrictions, rules, or access requirements associated with the space.',
      'Drivers are responsible for using a booked space reasonably and lawfully, following the listing details and host rules, and complying with all applicable laws, bylaws, and parking restrictions.',
      'All users are responsible for providing accurate information, communicating in a timely and respectful manner, and making reasonable efforts to resolve issues directly with one another. plekk may, but is not required to, assist with communication or issue resolution and may take action under these Terms where necessary. plekk may suspend or remove listings or accounts that repeatedly violate these responsibilities.',
      'Users are responsible for taking reasonable precautions to protect their personal information and property when interacting with other users through the platform.',
    ],
  },
  {
    title: '5. Fees & Payments',
    paragraphs: [
      'plekk charges service fees in connection with confirmed bookings. Applicable fees are displayed during booking or listing creation, before a user commits to a transaction.',
      'plekk may withhold, delay, or adjust payouts where reasonably necessary to resolve disputes, address chargebacks, prevent fraud, or comply with applicable law. Hosts must provide accurate and complete payment information as required by plekk\u2019s payment processor to receive payouts.',
      'Payments made through plekk are processed by a third-party payment processor, currently Stripe. plekk does not store full credit card or payment information.',
      'By making or receiving payments through plekk, you authorize plekk and its payment processor to process payments in accordance with these Terms and the payment processor\u2019s applicable terms and policies. Use of the payment processing services may be subject to additional terms imposed by the payment processor.',
      'plekk is not responsible for payment processing errors, interruptions, or delays that are outside of plekk\u2019s reasonable control and are caused by payment processors or financial institutions, except to the extent required by applicable law.',
      'plekk may update service fees from time to time, with changes applying only to future bookings.',
      'Taxes may be added where required by law and will be shown before payment is completed.',
    ],
  },
  {
    title: '6. Cancellations & Refunds',
    paragraphs: [
      'Each listing on plekk includes a cancellation policy set by the Host. The applicable cancellation policy is displayed before a booking is confirmed, and Drivers are responsible for reviewing it before booking.',
      'plekk processes cancellations and refunds in accordance with the cancellation policy that applies to the booking at the time it was made. Refunds, if any, are limited to amounts processed through the plekk platform.',
      'plekk is not responsible for costs or losses outside the platform, such as alternative parking, towing, tickets, or other third-party expenses, except where required by applicable law.',
      'In limited circumstances, plekk may provide assistance or issue refunds where a booking cannot be completed due to a platform error or a verified issue with the listing.',
      'Service fees are generally non-refundable once a booking is confirmed and will be refunded only under certain circumstances, including due to a platform error, or where a refund is required by applicable law.',
    ],
  },
  {
    title: '7. Risk Allocation',
    paragraphs: [
      'plekk does not provide insurance, roadside assistance, or guarantees regarding listed spaces, and does not supervise or control the use of any space.',
      'Except to the extent required by applicable law, Hosts and Drivers assume responsibility for risks arising from the use of a space, including property damage, vehicle theft, personal injury, citations, or other losses related to a booking.',
      'plekk is not responsible for the condition, safety, legality, or suitability of any listed space, or for the acts or omissions of Hosts or Drivers.',
    ],
  },
  {
    title: '8. Prohibited Activities',
    paragraphs: [
      'Users may not use plekk to engage in unlawful activity or in any way that violates these Terms. Prohibited activities include, but are not limited to:',
    ],
    items: [
      'misrepresenting a listing or booking, including providing false or misleading information;',
      'attempting to bypass the plekk platform for payment or communication related to a booking;',
      'damaging property or creating safety risks;',
      'harassing, threatening, or discriminating against other users;',
      'interfering with another user\u2019s lawful use of plekk, including disrupting access to a booked space; or',
      'using plekk in a manner that exposes plekk, other users, or the public to legal or safety risk.',
    ],
  },
  {
    title: '',
    paragraphs: [
      'plekk may take action where it reasonably believes a user has violated these Terms or poses a risk to the community, including suspending or terminating accounts, removing listings, cancelling bookings, or taking other appropriate steps.',
    ],
  },
  {
    title: '9. Disclaimers & Limitation of Liability',
    paragraphs: [
      'plekk provides the platform on an "as is" and "as available" basis. Except as required by applicable law, plekk makes no warranties or representations regarding the availability, accuracy, or suitability of the platform or any listed space.',
      'To the maximum extent permitted by law, plekk will not be liable for indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, goodwill, or business opportunities arising from or related to use of the platform.',
      'Except where liability cannot be limited by law, plekk\u2019s total liability for any claim arising out of or related to these Terms or use of the platform will not exceed the total service fees paid to plekk by you in the twelve (12) months preceding the event giving rise to the claim.',
      'plekk is not responsible for the acts or omissions of Hosts or Drivers, or for conditions or events occurring at any listed space.',
    ],
  },
  {
    title: '10. Indemnification',
    paragraphs: [
      'You agree to indemnify and hold plekk, its officers, directors, employees, and agents harmless from any third-party claims, damages, losses, and reasonable legal fees arising out of or related to:',
    ],
    items: [
      'your use of the platform;',
      'your listing, booking, or use of a space;',
      'your interactions with other users; or',
      'your breach of these Terms or applicable law.',
    ],
  },
  {
    title: '',
    paragraphs: [
      'This indemnification obligation does not apply to the extent a claim arises from plekk\u2019s own negligence or willful misconduct.',
    ],
  },
  {
    title: '11. Modifications',
    paragraphs: [
      'plekk may update these Terms from time to time. When we make changes, we will post the updated Terms with a revised effective date.',
      'If we make material changes, we will take reasonable steps to notify users, such as through the platform or by email. Changes apply only from the effective date forward. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.',
    ],
  },
  {
    title: '12. Governing Law & Dispute Resolution',
    paragraphs: [
      'These Terms are governed by the laws of the Province of Nova Scotia and the federal laws of Canada applicable therein, without regard to conflict of laws principles.',
      'Except where prohibited by applicable law, any dispute arising out of or related to these Terms or use of the platform shall be brought exclusively in the courts located in Halifax, Nova Scotia, and users consent to the personal jurisdiction of those courts.',
      'The parties may agree, in writing, to resolve a dispute through arbitration as an alternative to court proceedings.',
      'Any arbitration shall be conducted in Nova Scotia under rules agreed to by the parties.',
    ],
  },
  {
    title: '13. Contact',
    paragraphs: [
      'Questions about these Terms may be sent to support@parkplekk.com. While plekk encourages users to communicate directly with one another to resolve issues related to a booking, plekk may provide guidance or assistance related to use of the platform.',
    ],
  },
  {
    title: '14. Severability',
    paragraphs: [
      'If any provision of these Terms is found to be invalid, unlawful, or unenforceable, that provision will be severed, and the remaining provisions will remain in full force and effect.',
    ],
  },
  {
    title: '15. Entire Agreement',
    paragraphs: [
      'These Terms constitute the entire agreement between you and plekk regarding your use of the platform and supersede any prior or contemporaneous agreements, communications, or understandings, whether written or oral, relating to the platform.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="bg-mist-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-charcoal-900 mb-3">plekk Terms of Service</h1>
          <p className="text-charcoal-600">
            Effective date: November 10, 2025. These Terms of Service (&quot;Terms&quot;) form a legal
            agreement between you and plekk Technologies Inc. (&quot;plekk,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) and govern your access to and use of the plekk marketplace platform, including
            our website and any related services (collectively, &quot;plekk&quot;).
          </p>
          <p className="text-charcoal-600 mt-3">
            By creating an account, listing a space, booking a space, or otherwise using plekk, you
            confirm that you have read, understood, and agree to be bound by these Terms.
          </p>
        </header>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <section
              key={section.title || `section-${i}`}
              className={`bg-white rounded-xl shadow-sm border border-mist-200 p-6${!section.title ? ' -mt-4 rounded-t-none border-t-0' : ''}`}
            >
              {section.title && (
                <h2 className="text-xl font-semibold text-charcoal-900 mb-3">{section.title}</h2>
              )}
              {section.paragraphs.map((p, j) => (
                <p key={j} className={`text-charcoal-600 leading-relaxed${j > 0 ? ' mt-3' : ''}`}>
                  {p}
                </p>
              ))}
              {section.items && (
                <ul className="list-disc pl-6 mt-3 space-y-1">
                  {section.items.map((item, k) => (
                    <li key={k} className="text-charcoal-600 leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="text-sm text-charcoal-500 mt-10">
          If you do not agree to these Terms, you must stop using plekk. By continuing to access or
          use the platform, you confirm that you have read, understood, and agree to be bound by
          these Terms, including plekk&apos;s limited role as a marketplace platform as described
          above. plekk does not provide parking services and does not control listed spaces.
        </p>
      </div>
    </div>
  )
}
