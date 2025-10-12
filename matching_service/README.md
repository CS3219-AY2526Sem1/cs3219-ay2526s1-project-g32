# PeerPrep - Matching Service

This repository contains the backend microservice responsible for matching users in the PeerPrep application. It provides a robust, scalable system for queueing users based on their preferred question topic and difficulty, finding suitable partners, and handling timeouts gracefully.

The service is built with TypeScript, Node.js, and Express, and it leverages Redis for high-speed queue management and RabbitMQ for an efficient, event-driven timeout mechanism.

## Architecture Overview

The Matching Service is designed as a standalone microservice that interacts with other services within the PeerPrep ecosystem.

- **Web Server (Express.js)**: Provides a versioned RESTful API for clients to interact with the service.

- **Queue Management (Redis)**: Uses Redis Lists to maintain a separate FIFO (First-In-First-Out) queue for each question topic. This ensures that matching is both fast and fair.

- **Timeout Handling (RabbitMQ)**: Implements an event-driven timeout system using a Time-To-Live (TTL) and Dead-Letter Exchange pattern in RabbitMQ. This is highly efficient and avoids the need for constant database polling.

- **Authentication Middleware**: JWT-based authentication system that validates tokens with the User Service to ensure secure access to all endpoints.

- **Controller/Service Pattern**: The code is structured to separate API routing and request handling (Controllers) from the core business logic (Services), making the application clean and maintainable.

- **Error Handling**: Comprehensive error handling with proper HTTP status codes, axios-specific error handling, and graceful service degradation.

## Key Features

### Core Matching Features
- **Criteria-Based Matching**: Matches users who have selected the same question topic and difficulty.
- **FIFO Queues**: Ensures that users who have been waiting the longest are the first to be matched.
- **Priority Re-queuing**: Disconnected users are added to the front of the queue for faster re-matching.
- **Atomic Operations**: Race condition prevention through Redis atomic operations.

### Real-time Features
- **Status Polling**: Allows clients to check the status of a pending match request (pending, success, or not_found).
- **Event-Driven Timeouts**: Automatically removes users from the queue after a 2-minute waiting period using a non-blocking RabbitMQ implementation.
- **Instant Matching**: When a suitable partner is found immediately, creates a collaboration session instantly.

### Security & Reliability
- **JWT Authentication**: All endpoints require valid JWT tokens validated against the User Service.
- **User Isolation**: Users can only access their own match status and data.
- **Service Communication**: Integrates with Collaboration Service to create coding sessions.
- **Error Recovery**: Automatically re-queues both users if collaboration session creation fails.
- **Graceful Degradation**: Handles downstream service failures appropriately.

### Operational Features
- **Health Monitoring**: Comprehensive logging for debugging and monitoring.
- **Cancellation Support**: Allows users to cancel their pending match request.
- **Scalable Design**: Stateless architecture suitable for horizontal scaling.

## Technical Implementation

### Service Architecture
```
matching_service/
├── src/
│   ├── index.ts                    # Main entry point & server setup
│   ├── redisClient.ts             # Redis connection singleton
│   ├── controllers/
│   │   └── matchingControllers.ts  # Request handlers & business logic
│   ├── middleware/
│   │   └── authMiddleware.ts       # JWT authentication middleware
│   ├── routes/
│   │   └── matching.ts            # API route definitions
│   └── services/
│       ├── queueService.ts        # Redis queue management
│       └── timeoutService.ts      # RabbitMQ timeout handling
├── .env                           # Environment configuration
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Documentation
```

### Data Structures
```typescript
interface QueueEntry {
  userId: string;
  difficulty: string;    // Easy, Medium, Hard
  timestamp: number;     // Unix timestamp
}

interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: any };
}
```

### Queue Management
- **Topic-Based Queues**: Separate Redis lists for each coding topic (Arrays, Graphs, etc.)
- **FIFO Processing**: First-come, first-served matching within each topic
- **Difficulty Filtering**: Only matches users with identical difficulty preferences
- **Status Tracking**: Redis-based user status management (pending/success/not_found)

### Timeout System
- **TTL Pattern**: Uses RabbitMQ TTL + Dead Letter Exchange (no plugin dependencies)
- **Automatic Cleanup**: Removes expired users from all queues after 2 minutes
- **Status Verification**: Only removes users still in "pending" state
- **Event-Driven**: Non-blocking, horizontally scalable design

## API Endpoints

All endpoints are prefixed with `/api/v1/matching` and **require authentication**.

### Create Match Request
**POST** `/requests`

Adds a user to the matchmaking queue. User ID is extracted from the JWT token.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "difficulty": "Easy",
  "topic": "Arrays"
}
```

**Responses:**

**200 OK (Match Found):**
```json
{
  "status": "success",
  "message": "Match found!",
  "sessionId": "session-1728650460000",
  "matchedWith": "user456"
}
```

**202 Accepted (Added to Queue):**
```json
{
  "status": "pending",
  "message": "No match found at this time. You have been added to the queue."
}
```

**401 Unauthorized:**
```json
{
  "message": "Authentication failed: No token provided."
}
```

### Get Match Status
**GET** `/requests/:userId/status`

Allows a client to poll for the current status of a user's match request. Users can only check their own status.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "status": "pending"
}
```

**403 Forbidden:**
```json
{
  "message": "Forbidden: You can only check your own match status."
}
```

### Cancel Match Request
**DELETE** `/requests`

Removes a user from the matchmaking queue. User ID is extracted from the JWT token.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "topic": "Arrays"
}
```

**Response:** `200 OK`

### Re-queue User (Internal)
**POST** `/requeue`

An internal endpoint for the Collaboration Service to add a user back to the front of the queue.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user123",
  "difficulty": "Easy",
  "topic": "Arrays"
}
```

**Response:** `200 OK`

## Getting Started (Local Development)

### Prerequisites

- Node.js (v18 or later)
- Redis (for queue management)
- RabbitMQ (for timeout handling)
- User Service (for authentication)

### Installation & Setup

1. Clone the repository.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a file named `.env` in the root of the matching_service directory and add the following configuration:
   ```env
   PORT=3000
   REDIS_URL="redis://localhost:6379"
   RABBITMQ_URL="amqp://localhost"
   COLLABORATION_SERVICE_URL="http://localhost:3001/api/v1/collaborations"
   AUTH_SERVICE_URL="http://localhost:3002/api/v1/auth"
   ```

### Running the Service

1. **Start Redis:**
   ```bash
   redis-server
   ```

2. **Start RabbitMQ:**
   
   If you installed with Homebrew:
   ```bash
   brew services start rabbitmq
   ```
   
   If you are using Docker:
   ```bash
   docker run -d --name some-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

3. **Start the User Service** (required for authentication):
   ```bash
   # Navigate to user_service directory and start it
   cd ../user_service && npm run dev
   ```

4. **Start the Matching Service:**
   ```bash
   npm start
   ```

The service will be running at `http://localhost:3000`.

## Testing the API

### Authentication Required
All API endpoints require a valid JWT token. First, obtain a token from the User Service:

```bash
# 1. Register a user (via User Service)
curl -X POST http://localhost:4001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123", "username": "testuser"}'

# 2. Login to get JWT token (via User Service)
curl -X POST http://localhost:4001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
```

### Testing Endpoints

```bash
# Create a match request (replace YOUR_JWT_TOKEN with actual token)
curl -X POST http://localhost:3000/api/v1/matching/requests \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"difficulty": "Easy", "topic": "Arrays"}'

# Check match status
curl -X GET http://localhost:3000/api/v1/matching/requests/YOUR_USER_ID/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Cancel match request
curl -X DELETE http://localhost:3000/api/v1/matching/requests \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"topic": "Arrays"}'

# Test without authentication (should return 401)
curl -X POST http://localhost:3000/api/v1/matching/requests \
     -H "Content-Type: application/json" \
     -d '{"difficulty": "Easy", "topic": "Arrays"}'
```

## Error Handling

The service implements comprehensive error handling:

- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: User trying to access other user's data
- **400 Bad Request**: Missing required fields
- **500 Internal Server Error**: Service errors with detailed logging
- **503 Service Unavailable**: Downstream service failures

## Production Considerations

### Scalability
- **Stateless Design**: Supports horizontal scaling with load balancers
- **Redis Clustering**: Compatible with Redis cluster setups
- **Event-Driven Architecture**: RabbitMQ enables distributed processing

### Monitoring
- **Structured Logging**: Comprehensive logs with service prefixes
- **Health Checks**: Root endpoint for service health verification
- **Error Categorization**: Different error types for monitoring systems

### Security
- **JWT Validation**: Secure token verification with User Service
- **User Isolation**: Data access control and validation
- **Service Communication**: Authenticated inter-service communication

## Dependencies

### Runtime Dependencies
- `express` - Web framework
- `redis` - Redis client for queue management
- `amqplib` - RabbitMQ client for message queuing
- `axios` - HTTP client for service communication
- `dotenv` - Environment variable management

### Development Dependencies
- `typescript` - Type safety and development tooling
- `ts-node` - TypeScript execution for development
- `@types/*` - Type definitions for libraries

## Future Enhancements

- WebSocket support for real-time match notifications
- Advanced matching algorithms (skill-based, preference learning)
- Match history and analytics
- Load balancing and service mesh integration
- Comprehensive test suite (unit, integration, e2e)