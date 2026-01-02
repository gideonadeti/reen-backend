# REEN Backend API

A scalable microservices-based RESTful API built with NestJS for powering a modern e-commerce platform. This backend service provides authentication, product management, shopping cart functionality, checkout processing, and order management through a distributed architecture that ensures high availability, scalability, and maintainability.

## Table of Contents

- [REEN Backend API](#reen-backend-api)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
    - [Authentication \& Authorization](#authentication--authorization)
    - [Product Management](#product-management)
    - [Shopping Cart](#shopping-cart)
    - [Checkout \& Payments](#checkout--payments)
    - [Order Management](#order-management)
    - [Event-Driven Architecture](#event-driven-architecture)
    - [API Features](#api-features)
  - [Screenshots](#screenshots)
  - [Technologies Used](#technologies-used)
    - [Core Framework](#core-framework)
    - [Database \& ORM](#database--orm)
    - [Authentication](#authentication)
    - [Payment Processing](#payment-processing)
    - [Inter-Service Communication](#inter-service-communication)
    - [Message Queue](#message-queue)
    - [Caching](#caching)
    - [API Documentation](#api-documentation)
    - [Email Service](#email-service)
    - [Development Tools](#development-tools)
    - [Testing](#testing)
  - [Architecture](#architecture)
  - [Running Locally](#running-locally)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Installation Steps](#installation-steps)
    - [Using Docker Compose](#using-docker-compose)
  - [Deployment](#deployment)
    - [Docker Compose Deployment](#docker-compose-deployment)
  - [Future Enhancements](#future-enhancements)
    - [Monitoring \& Logging](#monitoring--logging)
    - [CI/CD Pipeline](#cicd-pipeline)
  - [Contributing](#contributing)
    - [Development Guidelines](#development-guidelines)
  - [Support](#support)
  - [Acknowledgements](#acknowledgements)

## Features

### Authentication & Authorization

- **Clerk Integration** - Primary authentication method using Clerk for modern user management
- **JWT Authentication** - Alternative authentication method with JWT tokens for traditional auth flows
- **User Registration & Login** - Secure user authentication supporting both Clerk and JWT-based authentication
- **Refresh Tokens** - Automatic token refresh for seamless sessions
- **User Roles** - Support for Admin, Non-Admin, and Anonymous user roles
- **Account Management** - User profile updates and account deletion
- **Cookie-Based Authentication** - Secure HTTP-only cookies for token storage

### Product Management

- **Product CRUD Operations** - Create, read, update, and delete products
- **Product Search & Filtering** - Advanced filtering by name, price range, and quantity
- **Pagination Support** - Efficient pagination for large product catalogs
- **Product Images** - Support for multiple image URLs per product
- **Inventory Management** - Track and update product quantities
- **Admin Product Management** - Admins can create and manage their own products
- **Bulk Operations** - Support for bulk product updates and deletions

### Shopping Cart

- **Cart Item Management** - Add, update, and remove items from shopping cart
- **User-Specific Carts** - Each user has their own isolated shopping cart
- **Quantity Management** - Update item quantities in the cart
- **Cart Retrieval** - Efficient cart data retrieval with product information

### Checkout & Payments

- **Stripe Integration** - Secure payment processing through Stripe Checkout
- **Checkout Session Creation** - Generate secure checkout sessions for cart items
- **Payment Webhooks** - Handle Stripe webhook events for payment completion
- **Order Processing** - Automatic order creation upon successful payment
- **Inventory Updates** - Automatic product quantity updates after purchase
- **Financial Tracking** - Updates user and admin financial information (balance, sales count, purchases count, amount gained, and amount spent) after transactions

### Order Management

- **Order Creation** - Automatic order creation from completed checkout sessions
- **Order History** - Users can view their order history
- **Order Details** - Detailed order information with product details
- **Order Status Tracking** - Track order status and completion
- **Admin Order Management** - Admins can view orders for their products

### Event-Driven Architecture

- **Asynchronous Event Processing** - Event-driven architecture using RabbitMQ
- **Saga Pattern Implementation** - Distributed transaction management for checkout flow
- **Event Retry Logic** - Automatic retry mechanism for failed events
- **Webhook Handling** - Process webhooks from external services (Stripe, Clerk)
- **Email Notifications** - Send email notifications for order confirmations and updates

### API Features

- **RESTful API Design** - Clean, consistent API endpoints
- **API Gateway Pattern** - Single entry point for all client requests
- **Load Balancing** - Multiple API gateway instances with Nginx load balancing
- **Input Validation** - Comprehensive request validation using class-validator and DTOs
- **Error Handling** - Structured error responses with proper HTTP status codes
- **Request Logging** - Comprehensive logging middleware for debugging and monitoring
- **CORS Support** - Configurable CORS for frontend integration
- **Swagger Documentation** - Interactive API documentation
- **Response Caching** - Redis-based caching for improved performance
- **Idempotency Support** - Prevents duplicate operations through idempotency records
- **Microservices Architecture** - Distributed services for scalability and maintainability

## Screenshots

For screenshots, please visit the [REEN Frontend repository](https://github.com/gideonadeti/reen-frontend#screenshots).

## Technologies Used

### Core Framework

- **NestJS** - Progressive Node.js framework for building efficient server-side applications
- **TypeScript** - Type-safe development
- **Monorepo Architecture** - NestJS monorepo for managing multiple services

### Database & ORM

- **MongoDB** - NoSQL database for flexible data storage
- **Prisma** - Modern database toolkit and ORM
- **Database Per Service** - Each microservice has its own database instance

### Authentication

- **Clerk** - Primary authentication and user management service (recommended)
- **JWT** - Alternative authentication method using JSON Web Tokens for stateless authentication
- **Passport.js** - Authentication middleware for JWT-based authentication
- **bcryptjs** - Password hashing for JWT-based authentication flows

### Payment Processing

- **Stripe** - Payment processing and checkout session management
- **Webhook Verification** - Secure webhook signature verification

### Inter-Service Communication

- **gRPC** - High-performance RPC framework for synchronous inter-service communication
- **Protocol Buffers** - Language-neutral data serialization for service contracts
- **Service Discovery** - Service-to-service communication through gRPC clients

### Message Queue

- **RabbitMQ** - Message broker for asynchronous event processing
- **AMQP** - Advanced Message Queuing Protocol for reliable message delivery
- **Event-Driven Patterns** - Decoupled service communication through events

### Caching

- **Redis** - In-memory data store for caching and session management
- **@nestjs/cache-manager** - Caching module for NestJS
- **Cache Invalidation** - Strategic cache invalidation for data consistency

### API Documentation

- **Swagger/OpenAPI** - Interactive API documentation

### Email Service

- **Nodemailer** - Email sending functionality for notifications

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Docker** - Containerization for development and deployment
- **Docker Compose** - Multi-container application orchestration
- **Nginx** - Reverse proxy and load balancer

### Testing

- **Jest** - Unit and integration testing framework
- **Supertest** - HTTP assertion library for API testing

## Architecture

This backend follows a microservices architecture pattern with the following services:

- **API Gateway** - Single entry point that routes requests to appropriate services, handles authentication, and provides API documentation
- **Auth Service** - User authentication, authorization, and user management (gRPC)
- **Products Service** - Product catalog management and inventory tracking (gRPC)
- **Cart Items Service** - Shopping cart management (gRPC)
- **Checkout Service** - Payment session creation and checkout processing (gRPC)
- **Orders Service** - Order management and order history (gRPC)
- **Events Handler Service** - Asynchronous event processing for webhooks and business logic (RabbitMQ)

Services communicate through:

- **gRPC** for synchronous requests
- **RabbitMQ** for asynchronous event processing
- **Redis** for caching and session management

### Architecture Diagram

![REEN Backend Architecture](REEN.excalidraw.png)

## Running Locally

### Prerequisites

- Node.js (v22 or higher)
- MongoDB database instances (one per service)
- Redis server
- RabbitMQ server
- Clerk account (for authentication)
- Stripe account (for payment processing)
- Docker and Docker Compose (recommended for local development)
- npm or yarn package manager

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Frontend Configuration
FRONTEND_BASE_URL="http://localhost:3001"

# Database URLs (one per service)
AUTH_DATABASE_URL="mongodb://user:password@localhost:27017/reen-auth?authSource=admin"
PRODUCTS_DATABASE_URL="mongodb://user:password@localhost:27017/reen-products?authSource=admin"
CART-ITEMS_DATABASE_URL="mongodb://user:password@localhost:27017/reen-cart-items?authSource=admin"
ORDERS_DATABASE_URL="mongodb://user:password@localhost:27017/reen-orders?authSource=admin"

# Redis Configuration
REDIS_SERVICE_URL="redis://localhost:6379"

# RabbitMQ Configuration
MESSAGE_BROKER_URL="amqp://guest:guest@localhost:5672"

# Service URLs (gRPC endpoints)
AUTH_SERVICE_URL="localhost:5001"
PRODUCTS_SERVICE_URL="localhost:5002"
CART-ITEMS_SERVICE_URL="localhost:5003"
CHECKOUT_SERVICE_URL="localhost:5004"
ORDERS_SERVICE_URL="localhost:5005"

# Clerk Configuration
CLERK_SECRET_KEY="your-clerk-secret-key"
CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"

# Stripe Configuration
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SIGNING_SECRET="your-stripe-webhook-signing-secret"

# Email Configuration (Optional)
EMAIL_SERVICE_API_KEY="your-email-service-api-key"

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/gideonadeti/reen-backend.git
   cd reen-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the databases**

   ```bash
   # Push schema to each service's database and generate Prisma Client
   npx prisma db push --schema=apps/auth/prisma/schema.prisma
   npx prisma db push --schema=apps/products/prisma/schema.prisma
   npx prisma db push --schema=apps/cart-items/prisma/schema.prisma
   npx prisma db push --schema=apps/orders/prisma/schema.prisma
   ```

   This command will push your Prisma schema to each MongoDB database and automatically generate the Prisma Client for each service.

4. **Start Redis server**

   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:8.0.2
   
   # Or using your system's package manager
   # Ubuntu/Debian: sudo apt-get install redis-server
   # macOS: brew install redis
   ```

5. **Start RabbitMQ server**

   ```bash
   # Using Docker
   docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   
   # Or using your system's package manager
   # Ubuntu/Debian: sudo apt-get install rabbitmq-server
   # macOS: brew install rabbitmq
   ```

6. **Start all services**

   ```bash
   # Start all services concurrently
   npm run start:dev:all
   
   # Or start services individually
   npm run start:dev                    # API Gateway
   npm run start:dev auth               # Auth Service
   npm run start:dev products           # Products Service
   npm run start:dev cart-items         # Cart Items Service
   npm run start:dev checkout           # Checkout Service
   npm run start:dev orders             # Orders Service
   npm run start:dev events-handler     # Events Handler Service
   ```

7. **Access the API**
   - API Base URL: `http://localhost:3000/api/v1`
   - Swagger Documentation: `http://localhost:3000/api-gateway/documentation`

### Using Docker Compose

For easier local development, you can use Docker Compose:

1. **Adjust Service URLs for Docker Compose**

   When using Docker Compose, services communicate through Docker's internal network. Update your `.env` file to use Docker service names instead of `localhost` for service URLs:

   ```env
   # Service URLs (gRPC endpoints) - Use Docker service names
   AUTH_SERVICE_URL="auth:5001"
   PRODUCTS_SERVICE_URL="products:5002"
   CART-ITEMS_SERVICE_URL="cart-items:5003"
   CHECKOUT_SERVICE_URL="checkout:5004"
   ORDERS_SERVICE_URL="orders:5005"
   
   # Redis Configuration - Use Docker service name
   REDIS_SERVICE_URL="redis://redis:6379"
   
   # RabbitMQ Configuration - Use Docker service name (if running in Docker)
   MESSAGE_BROKER_URL="amqp://guest:guest@rabbitmq:5672"
   ```

   **Note:** If you're running MongoDB and RabbitMQ outside of Docker Compose, keep using `localhost` for those URLs.

2. **Start all services with Docker Compose**

   ```bash
   docker compose -f compose.yaml -f compose.dev.yaml up
   ```

   This will start all services, Redis, and set up the necessary networking.

3. **Access the API**
   - API Base URL: `http://localhost:3000/api/v1`
   - Swagger Documentation: `http://localhost:3000/api-gateway/documentation`

## Deployment

### Docker Compose Deployment

This project is designed to be deployed using Docker Compose with images stored in GitHub Container Registry (GHCR). The production setup includes:

1. **Build Docker Images**

   ```bash
   docker compose -f compose.yaml -f compose.build.yaml build
   ```

2. **Push Images to GitHub Container Registry (GHCR)**

   After building, tag and push each service image to GHCR:

   ```bash
   # Tag and push each service (example for auth service)
   docker tag reen-backend-auth:latest ghcr.io/gideonadeti/reen-backend-auth:latest
   docker push ghcr.io/gideonadeti/reen-backend-auth:latest
   
   # Repeat for other services: products, cart-items, checkout, orders, events-handler, api-gateway
   ```

3. **Deploy on Cloud Server (e.g., AWS EC2)**

   On your cloud server (EC2 instance):

   a. **Clone or pull the repository**

      ```bash
      git clone https://github.com/gideonadeti/reen-backend.git
      cd reen-backend
      ```

   b. **Set up environment variables**

      Create a `.env` file in the root directory with all required production environment variables:
      - Database URLs pointing to production MongoDB instances
      - Production Redis and RabbitMQ URLs
      - Production Clerk and Stripe credentials
      - `FRONTEND_BASE_URL` set to your frontend URL
      - Service URLs configured for Docker Compose (use service names, not localhost)

   c. **Deploy with Docker Compose**

      ```bash
      docker compose -f compose.yaml -f compose.prod.yaml up -d
      ```

      The production setup includes:
      - Multiple API Gateway instances for load balancing
      - Nginx reverse proxy and load balancer
      - All microservices running in containers
      - Redis for caching
      - SSL/TLS support through Nginx

4. **Expose the Service (Without Domain - Using ngrok)**

   If you don't have a domain yet, you can use ngrok to expose your service:

   a. **Install ngrok** (if not already installed)

      ```bash
      # Download and install ngrok
      # Visit https://ngrok.com/download for installation instructions
      ```

   b. **Run ngrok in a detached tmux session**

      ```bash
      # Create a new tmux session
      tmux new -s ngrok
      
      # Run ngrok to tunnel to nginx on port 443
      ngrok http --domain=your-ngrok-domain.ngrok-free.app 443
      
      # Detach from tmux: Press Ctrl+B, then D
      ```

      **Network Flow:** Client → ngrok → Nginx (port 443) → API Gateways

   c. **Configure Frontend**

      Update your frontend's API base URL to point to your ngrok domain:

      ```text
      https://your-ngrok-domain.ngrok-free.app/api/v1
      ```

5. **SSL/TLS Configuration (For Production with Domain)**

   When you have a domain:
   - Place your SSL certificate as `cert.crt` in the root directory
   - Place your SSL private key as `key.key` in the root directory
   - Nginx will automatically configure HTTPS on port 443
   - Update your DNS to point to your server's IP address
   - Configure `FRONTEND_BASE_URL` to use your domain

**Note:** Make sure the `.env` file is in the root directory where you run the `docker compose` command, as all services mount this file for their configuration.

## Future Enhancements

The following features are planned for future implementation:

### Monitoring & Logging

- **Prometheus** - Metrics collection and monitoring for all microservices
- **Grafana** - Visualization and dashboards for system metrics and performance monitoring
- **ELK Stack (Elasticsearch, Logstash, Kibana)** - Centralized logging aggregation and log analysis across all microservices

### CI/CD Pipeline

- **GitHub Actions** or **Jenkins** - Automated build, test, and deployment pipeline for each microservice
- Automated testing integration
- Container image building and pushing to registry
- Automated deployment to staging and production environments

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Update documentation as needed
- Ensure all tests pass before submitting
- Follow microservices best practices
- Maintain service boundaries and contracts
- Update protocol buffer definitions when adding new gRPC methods

## Support

If you find this project helpful or interesting, consider supporting me:

[☕ Buy me a coffee](https://buymeacoffee.com/gideonadeti)

## Acknowledgements

This project is inspired by the [roadmap.sh Scalable E-Commerce Platform](https://roadmap.sh/projects/scalable-ecommerce-platform) project challenge. The implementation follows the project specifications, including core microservices (User Service, Product Catalog Service, Shopping Cart Service, Order Service, Payment Service), API Gateway pattern, Docker containerization, and service communication using REST APIs and gRPC. Additionally, event-driven architecture using RabbitMQ, distributed transaction management using the Saga pattern, and notification services have been added as extensions to enhance the platform's capabilities.

This project demonstrates a production-ready microservices architecture for e-commerce applications. The implementation follows best practices including:

- Service-oriented architecture with clear boundaries
- Event-driven patterns for asynchronous processing
- Distributed transaction management using the Saga pattern
- High availability through load balancing and multiple instances
- Comprehensive error handling and retry mechanisms
- Caching strategies for improved performance

Thanks to these technologies:

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Clerk](https://clerk.com/) - Authentication and user management
- [Stripe](https://stripe.com/) - Payment processing
- [gRPC](https://grpc.io/) - High-performance RPC framework
- [RabbitMQ](https://www.rabbitmq.com/) - Message broker
- [Redis](https://redis.io/) - In-memory data store
- [Docker](https://www.docker.com/) - Containerization platform
