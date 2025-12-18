// API base URL - will be determined dynamically in the ApiService class

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private getBaseURL(): string {
    // Use full backend URL if available (for production/staging)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      // Remove trailing /api if present, we'll add it back
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      return `${baseUrl}/api`;
    }
    
    // Fallback to relative URL for local development with rewrites
    if (typeof window !== 'undefined') {
      return '/api';
    }
    // Server-side: use full URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.getBaseURL()}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses (like 404 or HTML error pages)
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const text = await response.text();
          // Try to parse JSON, handle malformed JSON
          if (text.trim().startsWith('"') && !text.trim().startsWith('{"')) {
            // Response might be a quoted string instead of JSON object
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
          }
          data = JSON.parse(text);
        } catch (parseError: any) {
          // If JSON parsing fails, try to extract error message
          const text = await response.text().catch(() => 'Unknown error');
          throw new Error(`Invalid response format: ${text.substring(0, 200)}`);
        }
      } else {
        // If response is not JSON, create a generic error
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP error! status: ${response.status} - ${text || response.statusText}`);
      }

      if (!response.ok) {
        // Handle 401/403 specifically for auth errors
        if (response.status === 401 || response.status === 403) {
          // Clear token on auth errors
          localStorage.removeItem('auth_token');
          throw new Error(data.message || 'Authentication failed. Please sign in again.');
        }
        // Create error object that includes response data for better error handling
        const error: any = new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
        error.response = { data, status: response.status };
        throw error;
      }

      return data;
    } catch (error: any) {
      // Don't log connection refused errors in production - they're expected if backend is down
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        // Silently handle connection errors - backend might not be running
        if (process.env.NODE_ENV === 'development') {
          console.warn('Backend server appears to be offline. Make sure it\'s running on port 8000.');
        }
      } else {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    isHost: boolean;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isHost: userData.isHost,
      }),
    });
  }

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/me');
  }

  async updateProfile(profileData: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
  }>): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const url = `${this.getBaseURL()}/auth/avatar`;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('No authentication token found. Please sign in again.');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });
    
    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError: any) {
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
    } else {
      const text = await response.text();
      throw new Error(`Invalid response format: ${text.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        const errorMessage = data?.message || data?.error || 'Authentication failed. Please sign in again.';
        throw new Error(errorMessage);
      }
      const error: any = new Error(data?.message || data?.error || `HTTP error! status: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }
    
    return data;
  }

  // Property endpoints
  async getProperties(filters?: any): Promise<ApiResponse<{ properties: any[] }>> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.request(`/properties${queryParams}`);
  }

  async getPropertiesNearLocation(lat: number, lng: number, radius?: number, filters?: any): Promise<ApiResponse<{ properties: any[] }>> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...(radius && { radius: radius.toString() }),
      ...filters
    });
    return this.request(`/properties?${params.toString()}`);
  }

  async getUserProperties(): Promise<ApiResponse<{ properties: any[] }>> {
    return this.request('/properties/user/my-properties');
  }

  async createProperty(propertyData: any): Promise<ApiResponse<{ property: any }>> {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  async getProperty(id: string): Promise<ApiResponse<{ property: any }>> {
    return this.request(`/properties/${id}`);
  }

  async updateProperty(id: string, propertyData: any): Promise<ApiResponse<{ property: any }>> {
    return this.request(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    });
  }

  async deleteProperty(id: string): Promise<ApiResponse> {
    return this.request(`/properties/${id}`, {
      method: 'DELETE',
    });
  }

  // Booking endpoints
  async createBooking(bookingData: any): Promise<ApiResponse<any>> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getUserBookings(role?: 'renter' | 'host'): Promise<ApiResponse<{ bookings: any[] }>> {
    const params = role ? `?role=${role}` : '';
    return this.request(`/bookings${params}`);
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse> {
    return this.request(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  }

  async generateReviewReminders(bookingId?: string): Promise<ApiResponse<{
    processed: number;
    created: number;
    message: string;
  }>> {
    return this.request('/bookings/generate-review-reminders', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  }

  // Message endpoints
  async getMessages(): Promise<ApiResponse<{ conversations: any[] }>> {
    return this.request('/messages');
  }

  async getBookingMessages(bookingId: string): Promise<ApiResponse<{ messages: any[]; booking: any }>> {
    return this.request(`/messages/booking/${bookingId}`);
  }

  async sendMessage(messageData: {
    bookingId: string;
    content: string;
    messageType?: string;
  }): Promise<ApiResponse<{ message: any }>> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Notification endpoints
  async getNotifications(params?: { isRead?: boolean; type?: string }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.isRead !== undefined) {
      queryParams.append('isRead', params.isRead.toString());
    }
    if (params?.type) {
      queryParams.append('type', params.type);
    }
    const queryString = queryParams.toString();
    return this.request(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return this.request('/notifications/unread-count');
  }

  // Verification endpoints
  async getVerificationStatus(): Promise<ApiResponse<{
    host: {
      emailVerified: boolean;
      identityVerified: boolean;
      stripePayoutVerified: boolean;
      badgeEarned: boolean;
      verificationStatus: string;
    };
    properties: Array<{
      id: string;
      photosVerified: boolean;
      locationVerified: boolean;
      badgeEarned: boolean;
      verificationStatus: string;
    }>;
  }>> {
    return this.request('/verification/status');
  }

  async submitIdentityVerification(data: {
    documentType: string;
    frontImageUrl: string;
    backImageUrl?: string;
    notes?: string;
  }): Promise<ApiResponse<{
    verificationId: string;
    status: string;
    message: string;
  }>> {
    return this.request('/verification/submit-identity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVerificationHistory(): Promise<ApiResponse<{
    verifications: Array<{
      id: string;
      verification_type: string;
      status: string;
      submitted_at: string;
      verified_at?: string;
      rejection_reason?: string;
    }>;
  }>> {
    return this.request('/verification/history');
  }

  // Admin verification endpoints
  async getPendingVerifications(params?: { type?: string; limit?: number; offset?: number }): Promise<ApiResponse<{
    verifications: Array<{
      id: string;
      type: string;
      status: string;
      submittedAt: string;
      documents: any;
      user?: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        address: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          country?: string;
        };
      };
      property?: {
        id: string;
        title: string;
        address: string;
      };
    }>;
    total: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    const queryString = queryParams.toString();
    return this.request(`/admin/verifications/pending${queryString ? `?${queryString}` : ''}`);
  }

  async getVerificationDetails(id: string): Promise<ApiResponse<any>> {
    return this.request(`/admin/verifications/${id}`);
  }

  async approveVerification(id: string, notes?: string): Promise<ApiResponse<{
    verificationId: string;
    status: string;
    badgeUpdated: boolean;
  }>> {
    return this.request(`/admin/verifications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectVerification(id: string, reason: string, notes?: string): Promise<ApiResponse<{
    verificationId: string;
    status: string;
    rejectionReason: string;
  }>> {
    return this.request(`/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    });
  }

  // Review endpoints
  async createReview(reviewData: {
    bookingId: string;
    rating: number;
    comment?: string;
    cleanliness?: number;
    communication?: number;
    checkIn?: number;
    accuracy?: number;
    value?: number;
  }): Promise<ApiResponse<{ review: any }>> {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async getBookingReviews(bookingId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/reviews/booking/${bookingId}`);
  }

  async getUserReviews(userId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/reviews/user/${userId}`);
  }

  async checkReviewEligibility(bookingId: string): Promise<ApiResponse<{ canReview: boolean; hasReviewed: boolean }>> {
    return this.request(`/reviews/check/${bookingId}`);
  }

  // Admin endpoints
  async getPendingProperties(): Promise<ApiResponse<{ properties: any[] }>> {
    return this.request('/properties/admin/pending');
  }

  async approveProperty(propertyId: string): Promise<ApiResponse<{ property: any }>> {
    return this.request(`/properties/${propertyId}/approve`, {
      method: 'PUT',
    });
  }

  async rejectProperty(propertyId: string, reason?: string): Promise<ApiResponse<{ property: any }>> {
    return this.request(`/properties/${propertyId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async adminDeleteProperty(propertyId: string): Promise<ApiResponse> {
    return this.request(`/properties/${propertyId}/admin`, {
      method: 'DELETE',
    });
  }

  async getAdminStats(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<{
    bookings: number;
    users: number;
    listings: number;
    totalBookingValue: number;
    totalServiceFeeRevenue: number;
    dateRange: { start: string | null; end: string | null };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    const queryString = queryParams.toString();
    return this.request(`/admin/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Stripe Connect
  async createConnectAccount(): Promise<ApiResponse<{ url: string; accountId: string }>> {
    return this.request('/payments/connect/create', {
      method: 'POST',
    });
  }

  async createOnboardingLink(): Promise<ApiResponse<{ url?: string; accountId?: string; pendingEarnings: number; message?: string; needsEarnings?: boolean }>> {
    return this.request('/payments/connect/onboarding-link', {
      method: 'POST',
    });
  }

  async getConnectAccountStatus(): Promise<ApiResponse<{
    connected: boolean;
    status?: string;
    payoutsEnabled?: boolean;
    chargesEnabled?: boolean;
    needsVerification?: boolean;
    verificationUrl?: string;
    requirements?: string[];
  }>> {
    return this.request('/payments/connect/status');
  }

  // Payments
  async createPaymentIntent(
    bookingIdOrPayload: string | {
      propertyId: string;
      startTime: string;
      endTime: string;
      vehicleInfo?: any;
      specialRequests?: string;
    }
  ): Promise<ApiResponse<{
    clientSecret: string;
    paymentIntentId: string;
    pricing?: {
      totalAmount: number;
      baseAmount: number;
      bookerServiceFee: number;
      hostServiceFee: number;
    };
  }>> {
    // If it's a string, treat it as bookingId
    const payload = typeof bookingIdOrPayload === 'string' 
      ? { bookingId: bookingIdOrPayload }
      : bookingIdOrPayload;
    
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<{
    booking: any;
    paymentIntentId: string;
  }>> {
    return this.request('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    });
  }

  async getPaymentHistory(): Promise<ApiResponse<{ payments: any[] }>> {
    return this.request('/payments');
  }

  async checkAvailability(propertyId: string, startTime: string, endTime: string): Promise<ApiResponse<{
    isAvailable: boolean;
    hasConflict?: boolean;
    conflictingBookings?: any[];
  }>> {
    const params = new URLSearchParams({
      startTime,
      endTime,
    });

    return this.request(`/bookings/availability/${propertyId}?${params.toString()}`);
  }
}

export const apiService = new ApiService();
export default apiService;
