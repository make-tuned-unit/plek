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
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
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
        document.addEventListener('touchstart', handleClickOutside)
        document.addEventListener('keydown', handleEsc)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
        document.removeEventListener('keydown', handleEsc)
      }
    }, [isOpen])

    // On mobile, use native time input for better UX
    if (isMobile) {
      return (
        <div className={className} ref={containerRef}>
          {label && (
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              {label}
            </label>
          )}
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 pointer-events-none z-10" />
            <input
              ref={ref}
              type="time"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              step={step * 60}
              min={minTime}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-charcoal-900 font-medium hover:border-accent-300 text-base"
            />
          </div>
        </div>
      )
    }

    // On desktop, use custom dropdown with larger touch targets
    return (
      <div className={className} ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 pointer-events-none z-10" />
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
            className="w-full pl-12 pr-4 py-3 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-charcoal-900 cursor-pointer font-medium hover:border-accent-300"
          />
          {isOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-mist-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
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
                    className={`w-full text-left px-4 py-3.5 text-base transition-colors min-h-[44px] flex items-center ${
                      isSelected
                        ? 'bg-accent-500 text-white font-semibold'
                        : 'text-charcoal-700 hover:bg-accent-50 font-medium'
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

