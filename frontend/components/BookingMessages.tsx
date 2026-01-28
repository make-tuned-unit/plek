'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, X, User } from 'lucide-react'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface BookingMessagesProps {
  bookingId: string
  onClose?: () => void
  otherUser?: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
}

export function BookingMessages({ bookingId, onClose, otherUser }: BookingMessagesProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bookingId) {
      fetchMessages()
      
      // Set up polling to fetch new messages every 3 seconds
      const pollInterval = setInterval(() => {
        fetchMessages(false) // Don't show loading state on polling
      }, 3000)
      
      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [bookingId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      const response = await apiService.getBookingMessages(bookingId)
      if (response.success && response.data) {
        const newMessages = response.data.messages || []
        
        // Only update if messages have changed (to avoid unnecessary re-renders)
        setMessages((prevMessages) => {
          const prevIds = new Set(prevMessages.map((m: any) => m.id))
          const newIds = new Set(newMessages.map((m: any) => m.id))
          
          // Check if messages have changed
          if (prevMessages.length !== newMessages.length || 
              !Array.from(newIds).every(id => prevIds.has(id))) {
            return newMessages
          }
          return prevMessages
        })
        
        // Update otherUser if not provided
        if (!otherUser && response.data.booking) {
          const isRenter = response.data.booking.renterId === user?.id
          // We'll get the other user from the first message or booking
        }
      }
    } catch (error: any) {
      // Only show error toast on initial load, not on polling
      if (showLoading) {
        console.error('Error fetching messages:', error)
        toast.error('Failed to load messages')
      }
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() || isSending) return

    const content = messageContent.trim()
    setMessageContent('')
    setIsSending(true)

    try {
      const response = await apiService.sendMessage({
        bookingId,
        content,
        messageType: 'text',
      })

      if (response.success && response.data?.message) {
        // Add new message to the list
        const newMessage = response.data.message
        setMessages((prev) => [...prev, newMessage])
        // Scroll to bottom after a brief delay
        setTimeout(scrollToBottom, 100)
      } else {
        toast.error('Failed to send message')
        setMessageContent(content) // Restore message on error
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Failed to send message')
      setMessageContent(content) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
        <span className="ml-3 text-gray-600">Loading messages...</span>
      </div>
    )
  }

  const displayOtherUser = otherUser || (messages.length > 0 && messages[0].receiver?.id !== user?.id 
    ? messages[0].receiver 
    : messages[0]?.sender)

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <MessageSquare className="h-5 w-5 text-accent-500 mr-2 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {displayOtherUser 
                ? `${displayOtherUser.first_name || displayOtherUser.firstName} ${displayOtherUser.last_name || displayOtherUser.lastName}`
                : 'Messages'}
            </h3>
            <p className="text-xs text-gray-500">Booking conversation</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 p-1 -mr-1 touch-target"
            aria-label="Close messages"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50"
        style={{ 
          maxHeight: 'calc(100vh - 200px)',
          minHeight: '300px'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const senderId = message.sender_id || message.senderId || message.sender?.id
            const isOwnMessage = senderId === user?.id
            const sender = message.sender || {}
            const senderName = sender.first_name || sender.firstName || 'User'
            const senderAvatar = sender.avatar

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isOwnMessage && (
                    <div className="flex-shrink-0 mr-2">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 max-w-full ${isOwnMessage ? 'bg-accent-500 text-white' : 'bg-white text-gray-900 border border-gray-200 shadow-sm'}`}>
                    {!isOwnMessage && (
                      <p className="text-xs font-medium mb-1 opacity-75 truncate">{senderName}</p>
                    )}
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1.5 ${isOwnMessage ? 'text-accent-100' : 'text-gray-400'}`}>
                      {formatTime(message.created_at || message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-end space-x-2 sm:space-x-3">
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent resize-none min-h-[44px]"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!messageContent.trim() || isSending}
            className="px-3 py-2.5 sm:px-4 sm:py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px] min-w-[44px] touch-target"
            aria-label="Send message"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

