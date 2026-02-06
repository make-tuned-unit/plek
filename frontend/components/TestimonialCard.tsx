import { Star } from 'lucide-react'

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  rating: number
}

export function TestimonialCard({ name, role, content, rating }: TestimonialCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-charcoal-900">{name}</h4>
          <p className="text-sm text-charcoal-600">{role}</p>
        </div>
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < rating ? 'text-yellow-400 fill-current' : 'text-mist-300'
              }`}
            />
          ))}
        </div>
      </div>
      <p className="text-charcoal-700 italic">"{content}"</p>
    </div>
  )
} 