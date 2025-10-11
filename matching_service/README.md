# PeerPrep - Matching Service

This repository contains the backend microservice responsible for matching users in the PeerPrep application. It provides a robust, scalable system for queueing users based on their preferred question topic and difficulty, finding suitable partners, and handling timeouts gracefully.

The service is built with TypeScript, Node.js, and Express, and it leverages Redis for high-speed queue management and RabbitMQ for an efficient, event-driven timeout mechanism.

## Architecture Overview

The Matching Service is designed as a standalone microservice that interacts with other services within the PeerPrep ecosystem.

- **Web Server (Express.js)**: Provides a versioned RESTful API for clients to interact with the service.

- **Queue Management (Redis)**: Uses Redis Lists to maintain a separate FIFO (First-In-First-Out) queue for each question topic. This ensures that matching is both fast and fair.

- **Timeout Handling (RabbitMQ)**: Implements an event-driven timeout system using a Time-To-Live (TTL) and Dead-Letter Exchange pattern in RabbitMQ. This is highly efficient and avoids the need for constant database polling.

- **Controller/Service Pattern**: The code is structured to separate API routing and request handling (Controllers) from the core business logic (Services), making the application clean and maintainable.

## Features

- **Criteria-Based Matching**: Matches users who have selected the same question topic and difficulty.

- **FIFO Queues**: Ensures that users who have been waiting the longest are the first to be matched.

- **Status Polling**: Allows clients to check the status of a pending match request (pending, success, or not_found).

- **Event-Driven Timeouts**: Automatically removes users from the queue after a 2-minute waiting period using a non-blocking RabbitMQ implementation.

- **Cancellation Support**: Allows users to cancel their pending match request.

- **Re-queue Mechanism**: Provides an internal endpoint for the Collaboration Service to re-queue a user if their partner disconnects prematurely.

## API Endpoints

All endpoints are prefixed with `/api/v1/matching`.

### Create Match Request
**POST** `/requests`

Adds a user to the matchmaking queue. If a suitable match is found immediately, it creates a session. Otherwise, the user is added to the waiting list.

**Body:**
```json
{
  "userId": "user123",
  "difficulty": "Easy",
  "topic": "Strings"
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

### Get Match Status
**GET** `/requests/:userId/status`

Allows a client to poll for the current status of a user's match request.

**Response:**
```json
{
  "status": "pending"
}
```

### Cancel Match Request
**DELETE** `/requests`

Removes a user from the matchmaking queue.

**Body:**
```json
{
  "userId": "user123",
  "topic": "Strings"
}
```

**Response:** `200 OK`

### Re-queue User (Internal)
**POST** `/requeue`

An internal endpoint for the Collaboration Service to add a user back to the front of the queue.

**Body:**
```json
{
  "userId": "user123",
  "difficulty": "Easy",
  "topic": "Strings"
}
```

**Response:** `200 OK`

## Getting Started (Local Development)

### Prerequisites

- Node.js (v18 or later)
- Redis
- RabbitMQ (or Docker)

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
   COLLABORATION_SERVICE_URL="http://localhost:3001"
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

3. **Start the Matching Service:**
   ```bash
   npm start
   ```

The service will be running at `http://localhost:3000`.

## Testing the API

You can test the API endpoints using curl or any HTTP client:

```bash
# Create a match request
curl -X POST http://localhost:3000/api/v1/matching/requests \
     -H "Content-Type: application/json" \
     -d '{"userId": "user123", "difficulty": "Easy", "topic": "Arrays"}'

# Check match status
curl http://localhost:3000/api/v1/matching/requests/user123/status

# Cancel match request
curl -X DELETE http://localhost:3000/api/v1/matching/requests \
     -H "Content-Type: application/json" \
     -d '{"userId": "user123", "topic": "Arrays"}'
```