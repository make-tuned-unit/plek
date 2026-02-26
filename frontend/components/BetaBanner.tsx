export function BetaBanner() {
  return (
    <div className="w-full bg-accent-600 text-white text-center py-2 px-4 text-sm md:text-base">
      We&apos;re in beta in Nova Scotia — please send feedback to{' '}
      <a
        href="mailto:support@parkplekk.com"
        className="underline font-medium hover:text-accent-100 focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
      >
        support@parkplekk.com
      </a>
    </div>
  )
}
