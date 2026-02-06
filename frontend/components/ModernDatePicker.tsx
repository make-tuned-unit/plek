'use client'

import { Calendar } from 'lucide-react'
import { forwardRef, useState, useEffect, useRef } from 'react'
import ReactDatePicker from 'react-datepicker'

interface ModernDatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export const ModernDatePicker = forwardRef<HTMLInputElement, ModernDatePickerProps>(
  ({ value, onChange, min, placeholder, label, required, className = '' }, ref) => {
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Detect mobile device
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const selectedDate = value ? new Date(value + 'T00:00:00') : null
    const minDate = min ? new Date(min + 'T00:00:00') : null

    const handleDateChange = (date: Date | null) => {
      if (date) {
        const dateString = date.toISOString().split('T')[0]
        onChange(dateString)
      }
    }

    // On mobile, use native input for better UX
    if (isMobile) {
      return (
        <div className={className} ref={containerRef}>
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
              placeholder={placeholder || 'Select date'}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-charcoal-900 font-medium hover:border-accent-300 text-base"
            />
          </div>
        </div>
      )
    }

    // On desktop, use react-datepicker with custom styling
    return (
      <div className={className} ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 pointer-events-none z-10" />
          <ReactDatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            minDate={minDate || undefined}
            dateFormat="EEE, MMM d"
            placeholderText={placeholder || 'Select date'}
            required={required}
            className="w-full pl-12 pr-4 py-3 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-charcoal-900 cursor-pointer font-medium hover:border-accent-300"
            wrapperClassName="w-full"
            calendarClassName="!border-2 !border-mist-200 !rounded-xl !shadow-2xl !p-4"
            dayClassName={(date) => {
              const baseClass = '!min-h-[44px] !min-w-[44px] !rounded-lg !transition-all !text-sm !font-medium'
              const today = new Date()
              if (date.toDateString() === today.toDateString()) {
                return `${baseClass} !ring-2 !ring-accent-400`
              }
              return baseClass
            }}
            popperModifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 8],
                },
              },
            ]}
          />
        </div>
        <style jsx global>{`
          .react-datepicker {
            font-family: inherit;
            border: none;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .react-datepicker__header {
            background-color: white;
            border-bottom: 1px solid #e5e7eb;
            padding-top: 0.75rem;
          }
          .react-datepicker__current-month {
            font-weight: 600;
            font-size: 1rem;
            color: #111827;
            margin-bottom: 0.5rem;
          }
          .react-datepicker__day-names {
            display: flex;
            justify-content: space-around;
            margin-bottom: 0.5rem;
          }
          .react-datepicker__day-name {
            color: #6b7280;
            font-weight: 600;
            font-size: 0.75rem;
            width: 44px;
            line-height: 44px;
            margin: 0;
          }
          .react-datepicker__day {
            width: 44px;
            height: 44px;
            line-height: 44px;
            margin: 0.125rem;
            border-radius: 0.5rem;
            color: #111827;
            font-weight: 500;
          }
          .react-datepicker__day:hover {
            background-color: #f0f9ff;
            border-radius: 0.5rem;
          }
          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background-color: #0ea5e9 !important;
            color: white !important;
            font-weight: 600;
            border-radius: 0.5rem;
          }
          .react-datepicker__day--disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .react-datepicker__day--today {
            border: 2px solid #0ea5e9;
            font-weight: 600;
          }
          .react-datepicker__navigation {
            top: 1rem;
            width: 44px;
            height: 44px;
            border-radius: 0.5rem;
          }
          .react-datepicker__navigation:hover {
            background-color: #f3f4f6;
          }
          .react-datepicker__navigation-icon::before {
            border-color: #374151;
            border-width: 2px 2px 0 0;
            width: 8px;
            height: 8px;
          }
        `}</style>
      </div>
    )
  }
)

ModernDatePicker.displayName = 'ModernDatePicker'

