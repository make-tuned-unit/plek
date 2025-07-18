#!/bin/bash

# DriveMyWay Setup Script
# This script sets up the development environment for DriveMyWay

set -e

echo "🚀 Setting up DriveMyWay development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js version $(node -v) is installed"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Please install Docker to use the full development environment."
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. Please install Docker Compose."
        return 1
    fi
    
    print_success "Docker and Docker Compose are installed"
    return 0
}

# Install dependencies
install_dependencies() {
    print_status "Installing root dependencies..."
    npm install
    
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    print_status "Installing shared dependencies..."
    cd shared
    npm install
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        print_warning "Please edit .env file with your configuration values"
    else
        print_status ".env file already exists"
    fi
}

# Start Docker services
start_docker() {
    if check_docker; then
        print_status "Starting Docker services (PostgreSQL, Redis)..."
        docker-compose up -d
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        print_success "Docker services started successfully"
    else
        print_warning "Skipping Docker services. Please start PostgreSQL and Redis manually."
    fi
}

# Generate Prisma client
generate_prisma() {
    print_status "Generating Prisma client..."
    cd backend
    npx prisma generate
    cd ..
    print_success "Prisma client generated"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd backend
    npx prisma migrate dev --name init
    cd ..
    print_success "Database migrations completed"
}

# Build shared package
build_shared() {
    print_status "Building shared package..."
    cd shared
    npm run build
    cd ..
    print_success "Shared package built"
}

# Main setup function
main() {
    print_status "Starting DriveMyWay setup..."
    
    # Check prerequisites
    check_node
    check_docker
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env
    
    # Start Docker services
    start_docker
    
    # Generate Prisma client
    generate_prisma
    
    # Run migrations
    run_migrations
    
    # Build shared package
    build_shared
    
    print_success "🎉 DriveMyWay setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Run 'npm run dev' to start the development servers"
    echo "3. Frontend will be available at http://localhost:3000"
    echo "4. Backend API will be available at http://localhost:8000"
    echo "5. Prisma Studio will be available at http://localhost:5555"
    echo ""
    echo "Happy coding! 🚗💨"
}

# Run main function
main "$@" 