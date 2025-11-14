# plekk - Driveway Rental Platform

A modern platform where homeowners can list their driveways for rent by hour, day, or longer periods. Built with scalability in mind to support future expansion to storage and event spaces.

## 🏗️ Architecture Overview

### Phase 1: Driveway Rentals
- User authentication and onboarding
- Property listing management
- Booking system with real-time availability
- Messaging between hosts and renters
- Payment processing with Stripe
- Automated notifications

### Future Phases
- **Storage Spaces**: Basement rentals for storage
- **Event Spaces**: Yard rentals for events and gatherings

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form + Zod** for form validation
- **NextAuth.js** for authentication
- **React Query** for state management
- **Stripe Elements** for payments

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Prisma** as ORM
- **PostgreSQL** for primary database
- **Redis** for caching and sessions
- **JWT** for authentication

### Infrastructure
- **Docker** for containerization
- **Vercel** for frontend deployment
- **Railway/Render** for backend deployment
- **AWS S3** for file storage
- **SendGrid** for email notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL
- Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd plekk
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment**
   ```bash
   # Start database and Redis
   docker-compose up -d
   
   # Install dependencies
   npm install
   
   # Run database migrations
   npm run db:migrate
   
   # Start development servers
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Prisma Studio: http://localhost:5555

## 📁 Project Structure

```
plekk/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App Router pages
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utilities and configurations
│   └── types/               # TypeScript type definitions
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Prisma models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   └── prisma/              # Database schema and migrations
├── shared/                  # Shared types and utilities
└── docker-compose.yml       # Development environment
```

## 🔄 Main User Flows

### Host Flow
1. **Registration & Onboarding**
   - Sign up with email/password or social login
   - Complete profile with verification
   - Add property details and photos
   - Set pricing and availability

2. **Listing Management**
   - Create and edit driveway listings
   - Upload photos and set descriptions
   - Configure pricing (hourly, daily, weekly)
   - Set availability calendar

3. **Booking Management**
   - Receive booking requests
   - Approve/decline bookings
   - Communicate with renters
   - Track earnings

### Renter Flow
1. **Search & Discovery**
   - Search by location and dates
   - Filter by price, size, amenities
   - View detailed listings and photos
   - Check availability in real-time

2. **Booking Process**
   - Select dates and times
   - Review pricing and terms
   - Complete payment
   - Receive confirmation

3. **Communication**
   - Message hosts for questions
   - Coordinate access details
   - Leave reviews after use

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - List properties with filters
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get property details
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Bookings
- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Messages
- `GET /api/messages` - List conversations
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get conversation

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/history` - Payment history

## 🗄️ Database Schema

### Core Entities
- **Users**: Hosts and renters
- **Properties**: Driveway listings
- **Bookings**: Rental reservations
- **Messages**: Communication between users
- **Payments**: Transaction records
- **Reviews**: User feedback

### Extensible Design
The schema is designed to support future property types:
- **Storage Spaces**: Basement rentals
- **Event Spaces**: Yard rentals for events

## 🔮 Future Expansion

### Storage Spaces (Phase 2)
- Add `propertyType` field to Properties table
- Include storage-specific fields (size, climate control, security)
- Implement inventory management
- Add delivery coordination features

### Event Spaces (Phase 3)
- Add event-specific fields (capacity, amenities, noise restrictions)
- Implement event planning tools
- Add vendor coordination features
- Include event insurance integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 