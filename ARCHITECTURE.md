# plekk Architecture Documentation

## System Overview

plekk is a modern, scalable platform for driveway rentals with a modular architecture designed to support future expansion to storage spaces and event venues. The system prioritizes automation, clean code, and extensibility.

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   File Storage  │    │   Cache Layer   │
│   (Socket.IO)   │    │   (AWS S3)      │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Authentication**: NextAuth.js
- **Payments**: Stripe Elements
- **Real-time**: Socket.IO Client
- **Maps**: React Map GL (Mapbox)
- **UI Components**: Custom components with Framer Motion

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **File Upload**: Multer + AWS S3
- **Payments**: Stripe API
- **Email**: SendGrid
- **Real-time**: Socket.IO
- **Validation**: Express Validator + Zod

#### Infrastructure
- **Containerization**: Docker
- **Frontend Deployment**: Vercel
- **Backend Deployment**: Railway/Render
- **Database**: PostgreSQL (managed)
- **File Storage**: AWS S3
- **CDN**: CloudFront
- **Monitoring**: Sentry

## 🗄️ Database Schema

### Core Entities

#### Users
```sql
users (
  id: String (CUID)
  email: String (unique)
  password: String (hashed)
  firstName: String
  lastName: String
  phone: String?
  avatar: String?
  isVerified: Boolean
  isHost: Boolean
  bio: String?
  address: String?
  city: String?
  state: String?
  zipCode: String?
  country: String?
  createdAt: DateTime
  updatedAt: DateTime
)
```

#### Properties (Extensible for Future Types)
```sql
properties (
  id: String (CUID)
  hostId: String (FK to users)
  title: String
  description: String
  propertyType: Enum (DRIVEWAY, STORAGE, EVENT_SPACE)
  address: String
  city: String
  state: String
  zipCode: String
  country: String
  latitude: Float?
  longitude: Float?
  size: Float (sq ft)
  maxVehicles: Int
  height: Float? (for storage)
  width: Float?
  length: Float?
  amenities: String[]
  restrictions: String[]
  accessType: Enum (REMOTE, KEY_PICKUP, CODE, IN_PERSON)
  accessInstructions: String?
  hourlyRate: Float?
  dailyRate: Float?
  weeklyRate: Float?
  monthlyRate: Float?
  securityDeposit: Float?
  isAvailable: Boolean
  instantBooking: Boolean
  minBookingHours: Int
  maxBookingDays: Int
  status: Enum (ACTIVE, INACTIVE, SUSPENDED, DELETED)
  isVerified: Boolean
  storageFeatures: JSON? (for storage spaces)
  eventFeatures: JSON? (for event spaces)
  createdAt: DateTime
  updatedAt: DateTime
)
```

#### Bookings
```sql
bookings (
  id: String (CUID)
  propertyId: String (FK to properties)
  renterId: String (FK to users)
  hostId: String (FK to users)
  startTime: DateTime
  endTime: DateTime
  totalHours: Float
  totalAmount: Float
  securityDeposit: Float
  serviceFee: Float
  status: Enum (PENDING, CONFIRMED, CANCELLED, COMPLETED, DISPUTED)
  paymentStatus: Enum (PENDING, COMPLETED, FAILED, REFUNDED, PARTIALLY_REFUNDED)
  specialRequests: String?
  vehicleInfo: JSON?
  createdAt: DateTime
  updatedAt: DateTime
)
```

#### Payments
```sql
payments (
  id: String (CUID)
  bookingId: String (FK to bookings)
  userId: String (FK to users)
  amount: Float
  currency: String
  paymentMethod: String (Stripe payment method ID)
  stripePaymentId: String (unique)
  stripeRefundId: String?
  status: Enum (PENDING, COMPLETED, FAILED, REFUNDED, PARTIALLY_REFUNDED)
  type: Enum (BOOKING, SECURITY_DEPOSIT, SERVICE_FEE, REFUND)
  createdAt: DateTime
  updatedAt: DateTime
)
```

#### Messages
```sql
messages (
  id: String (CUID)
  bookingId: String (FK to bookings)
  senderId: String (FK to users)
  receiverId: String (FK to users)
  content: String
  messageType: Enum (TEXT, IMAGE, FILE)
  isRead: Boolean
  createdAt: DateTime
  updatedAt: DateTime
)
```

#### Reviews
```sql
reviews (
  id: String (CUID)
  bookingId: String (FK to bookings, unique)
  reviewerId: String (FK to users)
  reviewedUserId: String (FK to users)
  propertyId: String
  rating: Int (1-5)
  comment: String?
  cleanliness: Int? (1-5)
  communication: Int? (1-5)
  checkIn: Int? (1-5)
  accuracy: Int? (1-5)
  value: Int? (1-5)
  createdAt: DateTime
  updatedAt: DateTime
)
```

## 🔄 User Flows

### Host Onboarding Flow
1. **Registration**: Email/password signup
2. **Profile Completion**: Personal information and verification
3. **Host Activation**: Become a host (optional business profile)
4. **Property Listing**: Add driveway details, photos, pricing
5. **Verification**: Property verification process
6. **Go Live**: Property becomes searchable

### Renter Booking Flow
1. **Search**: Location-based search with filters
2. **Property Selection**: View details, photos, reviews
3. **Availability Check**: Real-time calendar integration
4. **Booking**: Select dates/times, special requests
5. **Payment**: Stripe payment processing
6. **Confirmation**: Booking confirmation and access details
7. **Communication**: Messaging with host
8. **Review**: Post-booking review and rating

### Automated Processes
- **Payment Processing**: Automatic charges and refunds
- **Notification System**: Email and push notifications
- **Availability Updates**: Real-time calendar sync
- **Review Reminders**: Automated follow-up emails
- **Dispute Resolution**: Automated escalation system

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login
GET  /api/auth/me           - Get current user
PUT  /api/auth/profile      - Update user profile
```

### Properties
```
GET    /api/properties      - List properties with filters
POST   /api/properties      - Create new property
GET    /api/properties/:id  - Get property details
PUT    /api/properties/:id  - Update property
DELETE /api/properties/:id  - Delete property
POST   /api/properties/:id/photos - Upload property photos
```

### Bookings
```
GET    /api/bookings        - List user bookings
POST   /api/bookings        - Create new booking
GET    /api/bookings/:id    - Get booking details
PUT    /api/bookings/:id    - Update booking status
DELETE /api/bookings/:id    - Cancel booking
```

### Messages
```
GET    /api/messages                    - List conversations
POST   /api/messages                    - Send message
GET    /api/messages/:conversationId    - Get conversation
```

### Payments
```
POST /api/payments/create-intent  - Create payment intent
POST /api/payments/confirm        - Confirm payment
GET  /api/payments/history        - Payment history
POST /api/payments/refund         - Process refund
```

### Notifications
```
GET /api/notifications           - List notifications
PUT /api/notifications/:id/read  - Mark as read
```

## 🔮 Future Expansion Architecture

### Phase 2: Storage Spaces
The current schema is designed to support storage spaces with minimal changes:

#### Schema Extensions
```sql
-- Add to properties table
storageFeatures: JSON {
  climateControl: Boolean
  securityFeatures: String[]
  accessHours: Object
  deliveryAllowed: Boolean
  inventoryManagement: Boolean
}
```

#### New Features
- **Inventory Management**: Track stored items
- **Delivery Coordination**: Coordinate with delivery services
- **Climate Control**: Monitor temperature/humidity
- **Security Features**: Enhanced security options
- **Access Scheduling**: Flexible access hours

#### API Extensions
```
POST /api/storage/inventory     - Manage stored items
POST /api/storage/delivery      - Schedule deliveries
GET  /api/storage/access-logs   - Access history
```

### Phase 3: Event Spaces
Extend the platform for event venue rentals:

#### Schema Extensions
```sql
-- Add to properties table
eventFeatures: JSON {
  capacity: Number
  eventTypes: String[]
  amenities: String[]
  noiseRestrictions: String[]
  vendorCoordination: Boolean
  insuranceRequired: Boolean
}
```

#### New Features
- **Event Planning Tools**: Event management interface
- **Vendor Coordination**: Connect with event vendors
- **Insurance Integration**: Event insurance requirements
- **Capacity Management**: Guest list and capacity tracking
- **Event Timeline**: Scheduling and coordination tools

#### API Extensions
```
POST /api/events/create         - Create event booking
GET  /api/events/vendors        - List available vendors
POST /api/events/insurance      - Insurance verification
GET  /api/events/timeline       - Event timeline management
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL
- Redis

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd plekk

# Install dependencies
npm run install:all

# Start development environment
docker-compose up -d
npm run dev

# Run database migrations
npm run db:migrate
```

### Environment Variables
Copy `env.example` to `.env` and configure:
- Database connection
- JWT secrets
- Stripe API keys
- AWS S3 credentials
- SendGrid API key
- Google Maps API key

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build:frontend
# Deploy to Vercel
```

### Backend (Railway/Render)
```bash
npm run build:backend
# Deploy to Railway or Render
```

### Database
- Use managed PostgreSQL service
- Set up automated backups
- Configure connection pooling

## 📊 Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Sentry integration
- **Performance**: Vercel Analytics
- **Uptime**: Health check endpoints
- **Logs**: Structured logging with Winston

### Business Metrics
- **User Growth**: Registration and activation rates
- **Booking Metrics**: Conversion rates, average booking value
- **Revenue**: Payment processing, refund rates
- **User Satisfaction**: Review scores, response times

## 🔒 Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Role-based access control
- Rate limiting on API endpoints
- Input validation and sanitization

### Data Protection
- Password hashing with bcrypt
- Encrypted sensitive data
- GDPR compliance measures
- Regular security audits

### Payment Security
- Stripe PCI compliance
- Secure payment processing
- Fraud detection systems
- Dispute resolution procedures

## 🧪 Testing Strategy

### Unit Tests
- Backend controllers and services
- Frontend components and utilities
- Database models and validations

### Integration Tests
- API endpoint testing
- Database integration
- Payment processing flows

### E2E Tests
- Complete user journeys
- Cross-browser testing
- Mobile responsiveness

## 📈 Scalability Considerations

### Database Scaling
- Connection pooling
- Read replicas for queries
- Database sharding strategy
- Caching with Redis

### Application Scaling
- Horizontal scaling with load balancers
- CDN for static assets
- Microservices architecture (future)
- Event-driven architecture

### Infrastructure Scaling
- Auto-scaling groups
- Container orchestration (Kubernetes)
- Multi-region deployment
- Disaster recovery plans

This architecture provides a solid foundation for the plekk MVP while ensuring the system can evolve to support storage spaces and event venues in future phases. 