'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { forwardRef, useState, useEffect, useRef } from 'react'

interface ModernDatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const ModernDatePicker = forwardRef<HTMLInputElement, ModernDatePickerProps>(
  ({ value, onChange, min, placeholder, label, required, className = '' }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedDate = value ? new Date(value) : null
    const minDate = min ? new Date(min) : null

    useEffect(() => {
      if (selectedDate) {
        setCurrentMonth(selectedDate.getMonth())
        setCurrentYear(selectedDate.getFullYear())
      }
    }, [selectedDate])

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

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay()
    }

    const formatDisplayValue = (dateString: string) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      }
      if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow'
      }

      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }

    const handleDateSelect = (day: number) => {
      const selected = new Date(currentYear, currentMonth, day)
      const dateString = selected.toISOString().split('T')[0]
      
      if (minDate && selected < minDate) {
        return
      }
      
      onChange(dateString)
      setIsOpen(false)
    }

    const navigateMonth = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        if (currentMonth === 0) {
          setCurrentMonth(11)
          setCurrentYear(currentYear - 1)
        } else {
          setCurrentMonth(currentMonth - 1)
        }
      } else {
        if (currentMonth === 11) {
          setCurrentMonth(0)
          setCurrentYear(currentYear + 1)
        } else {
          setCurrentMonth(currentMonth + 1)
        }
      }
    }

    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    const isToday = (day: number) => {
      const today = new Date()
      return (
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear()
      )
    }

    const isSelected = (day: number) => {
      if (!selectedDate) return false
      return (
        day === selectedDate.getDate() &&
        currentMonth === selectedDate.getMonth() &&
        currentYear === selectedDate.getFullYear()
      )
    }

    const isDisabled = (day: number) => {
      if (!minDate) return false
      const date = new Date(currentYear, currentMonth, day)
      return date < minDate
    }

    return (
      <div className={className} ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 pointer-events-none z-10" />
          <input
            ref={ref}
            type="text"
            value={formatDisplayValue(value)}
            readOnly
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setIsOpen(!isOpen)
              }
            }}
            placeholder={placeholder || 'Select date'}
            required={required}
            className="w-full pl-12 pr-4 py-3 border-2 border-mist-300 rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all bg-white text-gray-900 cursor-pointer font-medium hover:border-accent-300"
          />
          {isOpen && (
            <div className="absolute left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 p-4 w-[320px]">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {months[currentMonth]} {currentYear}
                </h3>
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />
                  }

                  const todayClass = isToday(day) ? 'ring-2 ring-accent-400' : ''
                  const selectedClass = isSelected(day)
                    ? 'bg-accent-500 text-white font-semibold'
                    : 'hover:bg-accent-50 text-gray-900'
                  const disabledClass = isDisabled(day) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      disabled={isDisabled(day)}
                      className={`aspect-square rounded-lg transition-all text-sm font-medium ${todayClass} ${selectedClass} ${disabledClass}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

ModernDatePicker.displayName = 'ModernDatePicker'

