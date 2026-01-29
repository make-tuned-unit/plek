'use client'

import { useState } from 'react'
import { apiService } from '@/services/api'
import toast from 'react-hot-toast'

const TOPICS = [
  { value: '', label: 'Select a topic' },
  { value: 'booking', label: 'Booking question' },
  { value: 'listing', label: 'Listing question' },
  { value: 'payments', label: 'Payments & payouts' },
  { value: 'technical', label: 'Technical support' },
  { value: 'other', label: 'Something else' },
] as const

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!name.trim() || !email.trim()) {
      toast.error('Please enter your name and email.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await apiService.submitContactForm({
        name: name.trim(),
        email: email.trim(),
        topic: topic.trim(),
        message: message.trim(),
      })
      if (res.success) {
        toast.success(res.message || 'Message sent! We\'ll get back to you soon.')
        setName('')
        setEmail('')
        setTopic('')
        setMessage('')
      } else {
        toast.error(res.message || 'Something went wrong. Please try again.')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send. Please try again or email us directly.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Johnson"
          required
          className="rounded-lg border border-mist-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-lg border border-mist-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="topic" className="text-sm font-medium text-gray-700">
          Topic
        </label>
        <select
          id="topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-lg border border-mist-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent bg-white text-charcoal-700"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Share details about how we can help."
          className="rounded-lg border border-mist-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-5 py-3 text-white font-medium hover:bg-accent-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending…' : 'Submit'}
      </button>
      <p className="text-sm text-gray-500">
        Submissions are sent to support and we&apos;ll reply from support@parkplekk.com. Please do not share
        sensitive financial information when contacting us.
      </p>
    </form>
  )
}
