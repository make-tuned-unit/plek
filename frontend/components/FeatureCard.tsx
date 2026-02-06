interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="relative h-full rounded-2xl bg-white border border-mist-200 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2 group">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-accent-400 via-sand-300 to-primary-700" />
      <div className="px-6 pb-6 pt-8 text-center flex flex-col items-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600 border border-accent-500/20 shadow-lg shadow-accent-500/20 group-hover:scale-110 group-hover:shadow-accent-500/30 transition-all duration-300">
          <span className="h-8 w-8">{icon}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-charcoal-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
} 