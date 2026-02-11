// API base URL - will be determined dynamically in the ApiService class

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private getBaseURL(): string {
    // Prefer explicit backend URL when provided (staging/production).
    // This avoids relying on Next.js rewrites that depend on BACKEND_URL.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      // Remove trailing /api if present, we'll add it back
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      return `${baseUrl}/api`;
    }

    // Fallback for local development: use relative URL and Next.js rewrites.
    if (typeof window !== 'undefined') {
      return '/api';
    }

    // Server-side fallback.
    return 'http://localhost:8000/api';
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
      
      // Handle non-JSON responses (like 404)
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If response is not JSON, create a generic error
        const text = await response.text();
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

  async googleAuth(accessToken: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });
  }

  async resendConfirmation(email: string): Promise<ApiResponse<{ message?: string }>> {
    return this.request('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message?: string }>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(params: {
    token_hash: string;
    token: string;
    type?: string;
    email?: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message?: string }>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token_hash: params.token_hash,
        token: params.token,
        type: params.type ?? 'recovery',
        email: params.email,
        newPassword: params.newPassword,
      }),
    });
  }

  async submitContactForm(data: { name: string; email: string; topic?: string; message?: string }): Promise<ApiResponse<{ message?: string }>> {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
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
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    bio: string;
    emailNotificationsBookings: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    profileVisible: boolean;
    allowReviews: boolean;
  }>): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
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
    const queryParam = role ? `?role=${role}` : '';
    return this.request(`/bookings${queryParam}`);
  }

  async updateBooking(bookingId: string, data: { status?: string; paymentStatus?: string }): Promise<ApiResponse<{ booking?: any }>> {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse> {
    return this.request(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  }

  async checkAvailability(propertyId: string, startTime: string, endTime: string): Promise<ApiResponse<{ isAvailable: boolean; hasConflict?: boolean }>> {
    return this.request(`/bookings/availability/${propertyId}?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`);
  }

  // Message endpoints
  async getMessages(): Promise<ApiResponse<{ messages: any[] }>> {
    return this.request('/messages');
  }

  async getBookingMessages(bookingId: string): Promise<ApiResponse<{ messages: any[]; booking?: any }>> {
    return this.request(`/messages/booking/${bookingId}`);
  }

  async sendMessage(messageData: any): Promise<ApiResponse<{ message: any }>> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Notification endpoints
  async getNotifications(): Promise<ApiResponse<{ notifications: any[] }>> {
    return this.request('/notifications');
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
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

  async searchUsers(search?: string): Promise<ApiResponse<{ users: any[] }>> {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return this.request(`/users${query}`);
  }

  async getDirectMessages(userId: string): Promise<ApiResponse<{ messages: any[]; otherUser: any }>> {
    return this.request(`/messages/direct/${encodeURIComponent(userId)}`);
  }

  async sendDirectMessage(receiverId: string, content: string): Promise<ApiResponse<{ message: any }>> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async getAdminStats(params?: { startDate?: string; endDate?: string; bookingStatus?: 'all' | 'paid' }): Promise<ApiResponse<{
    bookings: number;
    users: number;
    listings: number;
    totalRevenue: number;
    totalFees: number;
    totalBookingValue: number;
    totalServiceFeeRevenue: number;
    dateRange: { start: string | null; end: string | null };
    filters?: { bookingStatus: string };
  }>> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.bookingStatus) searchParams.set('bookingStatus', params.bookingStatus);
    const query = searchParams.toString();
    return this.request(`/admin/stats${query ? `?${query}` : ''}`);
  }

  // Stripe Connect
  async createConnectAccount(accountType: 'individual' | 'company' = 'individual'): Promise<ApiResponse<{ url: string; accountId: string }>> {
    return this.request('/payments/connect/create', {
      method: 'POST',
      body: JSON.stringify({ accountType }),
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

  async disconnectConnectAccount(): Promise<ApiResponse<{ disconnected: boolean }>> {
    return this.request('/payments/connect/disconnect', { method: 'POST' });
  }

  async getHostEarnings(): Promise<ApiResponse<{
    totalGross: number;
    totalPlatformFee: number;
    netEarnings: number;
    pendingPayout: number;
    breakdown: Array<{
      bookingId: string;
      propertyTitle: string;
      totalAmount: number;
      bookerServiceFee: number;
      grossAmount: number;
      platformFee: number;
      yourEarnings: number;
      startTime: string;
    }>;
  }>> {
    return this.request('/payments/earnings');
  }

  async getRefundEligibleBookings(): Promise<ApiResponse<{ bookings: any[] }>> {
    return this.request('/payments/refund-eligible');
  }

  async processRefund(bookingId: string, payload: { type: 'full' | 'partial'; amount?: number }): Promise<ApiResponse<{ refundId?: string; paymentStatus?: string }>> {
    return this.request(`/payments/refund/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async declineRefund(bookingId: string): Promise<ApiResponse<unknown>> {
    return this.request(`/payments/refund/${bookingId}/decline`, { method: 'POST' });
  }

  // Payments
  async createPaymentIntent(payload: {
    propertyId: string;
    startTime: string;
    endTime: string;
    vehicleInfo?: any;
    specialRequests?: string;
  }): Promise<ApiResponse<{
    clientSecret: string;
    paymentIntentId: string;
    currency?: string;
    pricing?: {
      totalAmount: number;
      baseAmount: number;
      bookerServiceFee: number;
      hostServiceFee: number;
      currency?: string;
    };
  }>> {
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

  // Review endpoints
  async createReview(reviewData: {
    bookingId: string;
    rating: number;
    comment?: string;
    reviewedUserId?: string;
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

  async getReviews(userId?: string, propertyId?: string): Promise<ApiResponse<{ reviews: any[] }>> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (propertyId) params.append('propertyId', propertyId);
    const query = params.toString();
    return this.request(`/reviews${query ? `?${query}` : ''}`);
  }

  /** Get reviews for a user (e.g. host) – public endpoint. Backend returns { success, data: reviews[] }. */
  async getReviewsByUser(userId: string): Promise<ApiResponse<{ reviews: any[] }>> {
    const res = await this.request<any>(`/reviews/user/${userId}`);
    const list = Array.isArray(res.data) ? res.data : [];
    return { success: res.success ?? true, data: { reviews: list }, error: res.error };
  }
}

export const apiService = new ApiService();
export default apiService;
