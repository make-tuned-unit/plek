'use client'

import { Clock } from 'lucide-react'
import { forwardRef, useState, useEffect, useRef } from 'react'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  step?: number // Minutes between options (default 15)
  minTime?: string // Minimum time in HH:MM format (e.g., "14:30")
}

const formatTimeLabel = (hours: number, minutes: number) => {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({ value, onChange, placeholder = 'Select time', label, required, className = '', step = 15, minTime }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Generate time options (every 15 minutes by default)
    const allTimeOptions = Array.from({ length: (24 * 60) / step }, (_, index) => {
      const totalMinutes = index * step
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      const timeValue = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      return {
        value: timeValue,
        label: formatTimeLabel(hours, minutes),
        totalMinutes: totalMinutes,
      }
    })

    // Filter options based on minTime
    const timeOptions = minTime
      ? (() => {
          const [minHours, minMinutes] = minTime.split(':').map(Number)
          const minTotalMinutes = minHours * 60 + minMinutes
          return allTimeOptions.filter((option) => option.totalMinutes > minTotalMinutes)
        })()
      : allTimeOptions

    const displayValue = value
      ? (() => {
          const [hours, minutes] = value.split(':').map(Number)
          return formatTimeLabel(hours, minutes)
        })()
      : ''

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEsc)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEsc)
      }
    }, [isOpen])

    return (
      <div className={className} ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
          <input
            ref={ref}
            type="text"
            value={displayValue}
            readOnly
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setIsOpen(!isOpen)
              }
            }}
            placeholder={placeholder}
            required={required}
            className="w-full pl-12 pr-4 py-2.5 border border-mist-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-colors bg-white text-gray-900 cursor-pointer"
          />
          {isOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-mist-200 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
              {timeOptions.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? 'bg-accent-500 text-white font-medium'
                        : 'text-gray-700 hover:bg-accent-50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
)

TimePicker.displayName = 'TimePicker'

