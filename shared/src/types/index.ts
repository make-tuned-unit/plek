import { z } from 'zod';

// User Types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  isVerified: z.boolean(),
  isHost: z.boolean(),
  bio: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Property Types
export const PropertyTypeSchema = z.enum(['DRIVEWAY', 'STORAGE', 'EVENT_SPACE']);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PropertyStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']);
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;

export const AccessTypeSchema = z.enum(['REMOTE', 'KEY_PICKUP', 'CODE', 'IN_PERSON']);
export type AccessType = z.infer<typeof AccessTypeSchema>;

export const PropertySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  title: z.string(),
  description: z.string(),
  propertyType: PropertyTypeSchema,
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  size: z.number(),
  maxVehicles: z.number(),
  height: z.number().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
  amenities: z.array(z.string()),
  restrictions: z.array(z.string()),
  accessType: AccessTypeSchema,
  accessInstructions: z.string().optional(),
  hourlyRate: z.number().optional(),
  dailyRate: z.number().optional(),
  weeklyRate: z.number().optional(),
  monthlyRate: z.number().optional(),
  securityDeposit: z.number().optional(),
  isAvailable: z.boolean(),
  instantBooking: z.boolean(),
  minBookingHours: z.number(),
  maxBookingDays: z.number(),
  status: PropertyStatusSchema,
  isVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  photos: z.array(z.object({
    id: z.string(),
    propertyId: z.string(),
    url: z.string(),
    caption: z.string().optional(),
    isPrimary: z.boolean(),
    order: z.number(),
    createdAt: z.date(),
  })).optional(),
  host: UserSchema.optional(),
});

export type Property = z.infer<typeof PropertySchema>;

export const PropertyPhotoSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  url: z.string(),
  caption: z.string().optional(),
  isPrimary: z.boolean(),
  order: z.number(),
  createdAt: z.date(),
});

export type PropertyPhoto = z.infer<typeof PropertyPhotoSchema>;

// Booking Types
export const BookingStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'DISPUTED']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const PaymentStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const BookingSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  renterId: z.string(),
  hostId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  totalHours: z.number(),
  totalAmount: z.number(),
  securityDeposit: z.number(),
  serviceFee: z.number(),
  status: BookingStatusSchema,
  paymentStatus: PaymentStatusSchema,
  specialRequests: z.string().optional(),
  vehicleInfo: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  property: PropertySchema.optional(),
  renter: UserSchema.optional(),
  host: UserSchema.optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

// Message Types
export const MessageTypeSchema = z.enum(['TEXT', 'IMAGE', 'FILE']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  messageType: MessageTypeSchema,
  isRead: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sender: UserSchema.optional(),
  receiver: UserSchema.optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Payment Types
export const PaymentTypeSchema = z.enum(['BOOKING', 'SECURITY_DEPOSIT', 'SERVICE_FEE', 'REFUND']);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentMethod: z.string(),
  stripePaymentId: z.string(),
  stripeRefundId: z.string().optional(),
  status: PaymentStatusSchema,
  type: PaymentTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// Review Types
export const ReviewSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  reviewerId: z.string(),
  reviewedUserId: z.string(),
  propertyId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  cleanliness: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  checkIn: z.number().min(1).max(5).optional(),
  accuracy: z.number().min(1).max(5).optional(),
  value: z.number().min(1).max(5).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  reviewer: UserSchema.optional(),
  reviewedUser: UserSchema.optional(),
});

export type Review = z.infer<typeof ReviewSchema>;

// Notification Types
export const NotificationTypeSchema = z.enum([
  'BOOKING_REQUEST',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'PAYMENT_RECEIVED',
  'MESSAGE_RECEIVED',
  'REVIEW_RECEIVED',
  'SYSTEM_UPDATE',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  isRead: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// API Response Types
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

// Search and Filter Types
export const SearchFiltersSchema = z.object({
  location: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  propertyType: PropertyTypeSchema.optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  instantBooking: z.boolean().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// Form Types
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginForm = z.infer<typeof LoginFormSchema>;

export const RegisterFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

export type RegisterForm = z.infer<typeof RegisterFormSchema>;

export const PropertyFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  size: z.number().min(1, 'Size must be at least 1 square foot'),
  maxVehicles: z.number().min(1, 'Must accommodate at least 1 vehicle'),
  hourlyRate: z.number().min(0, 'Hourly rate cannot be negative'),
  dailyRate: z.number().min(0, 'Daily rate cannot be negative'),
  amenities: z.array(z.string()),
  restrictions: z.array(z.string()),
  accessType: AccessTypeSchema,
  accessInstructions: z.string().optional(),
  instantBooking: z.boolean(),
});

export type PropertyForm = z.infer<typeof PropertyFormSchema>;

// Socket Event Types
export interface SocketEvents {
  join: (userId: string) => void;
  send_message: (data: { receiverId: string; content: string; bookingId: string }) => void;
  typing: (data: { receiverId: string; isTyping: boolean }) => void;
  booking_update: (data: { userId: string; bookingId: string; status: BookingStatus }) => void;
  new_message: (data: Message) => void;
  user_typing: (data: { senderId: string; isTyping: boolean }) => void;
  booking_updated: (data: Booking) => void;
} 