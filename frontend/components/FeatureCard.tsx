interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="relative h-full rounded-2xl bg-white/90 border border-mist-200 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-accent-400 via-sand-300 to-primary-700" />
      <div className="px-6 pb-6 pt-8 text-center flex flex-col items-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600 border border-accent-500/20 shadow-[0_10px_30px_rgba(61,187,133,0.12)]">
          <span className="h-8 w-8">{icon}</span>
        </div>
        <h3 className="text-xl font-semibold text-primary-900 mb-3">
        {title}
        </h3>
        <p className="text-sm text-charcoal-500 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
} 