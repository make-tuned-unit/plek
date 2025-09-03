'use client'

import { useState } from 'react'
import { apiService } from '@/services/api'

export default function ApiTest() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    
    try {
      const response = await fetch('http://localhost:8000/health')
      if (response.ok) {
        const data = await response.json()
        setStatus(`✅ Connected! Server: ${data.status}, Environment: ${data.environment}`)
      } else {
        setStatus(`❌ Connection failed: ${response.status}`)
      }
    } catch (error) {
      setStatus(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuthEndpoint = async () => {
    setLoading(true)
    setStatus('Testing auth endpoint...')
    
    try {
      const response = await apiService.getMe()
      setStatus('✅ Auth endpoint working! (This will fail without auth token, which is expected)')
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        setStatus('✅ Auth endpoint working! (Unauthorized response is expected without token)')
      } else {
        setStatus(`❌ Auth endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">API Connection Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Backend Connection
        </button>
        
        <button
          onClick={testAuthEndpoint}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Auth Endpoint
        </button>
        
        {status && (
          <div className="p-3 bg-gray-100 rounded text-sm">
            <strong>Status:</strong> {status}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-600">
        <p>• Backend should be running on port 8000</p>
        <p>• Check your backend terminal for request logs</p>
        <p>• This helps verify CORS and API connectivity</p>
      </div>
    </div>
  )
}
