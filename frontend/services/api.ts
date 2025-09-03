const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
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
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
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

  // Property endpoints
  async getProperties(filters?: any): Promise<ApiResponse<{ properties: any[] }>> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.request(`/properties${queryParams}`);
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

  // Booking endpoints
  async createBooking(bookingData: any): Promise<ApiResponse<{ booking: any }>> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getUserBookings(): Promise<ApiResponse<{ bookings: any[] }>> {
    return this.request('/bookings');
  }

  // Message endpoints
  async getMessages(): Promise<ApiResponse<{ messages: any[] }>> {
    return this.request('/messages');
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
}

export const apiService = new ApiService();
export default apiService;
