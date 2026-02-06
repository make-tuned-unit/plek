'use client'

import { Calendar } from 'lucide-react'
import { forwardRef } from 'react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, min, placeholder, label, required, className = '' }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 pointer-events-none z-10" />
          <input
            ref={ref}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            required={required}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3.5 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-charcoal-900 font-medium hover:border-accent-300 text-base"
          />
        </div>
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

