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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            ref={ref}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            required={required}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-2.5 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-colors bg-white text-gray-900"
          />
        </div>
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

