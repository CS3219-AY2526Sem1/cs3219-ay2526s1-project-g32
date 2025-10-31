# Question Service

Service responsible for managing coding questions, including CRUD operations, filtering by difficulty and topics, and providing random question selection for matching and collaboration services.

## Features Implemented

- **Question CRUD API** – Full create, read, update, and delete operations for coding questions with Zod validation.
- **Advanced filtering** – Query questions by title, difficulty level, and topics with optimized database indexes.
- **Random question selection** – `GET /api/v1/questions/random` returns a random question based on optional difficulty and topic filters, used by matching service.
- **LeetCode import script** – Automated import of 1000+ LeetCode-style questions from external API with detailed descriptions, topics, and difficulty levels.
- **Supabase integration** – PostgreSQL database hosted on Supabase with full TypeScript type safety and migration support.
- **CORS support** – Configured for cross-origin requests from frontend and other microservices.

## Project Structure

```
question_service/
  index.ts                   # Service entrypoint (Express + Supabase connection)
  supabase-schema.sql        # Database schema with indexes and triggers
  scripts/
    import-leetcode-questions.ts  # LeetCode import automation
  src/
    controllers/
      questionController.ts  # REST API handlers
    middleware/
      validation.ts          # Zod-based request validators
    models/
      db.ts                  # Supabase client configuration
      Question.ts            # Question service with CRUD methods
    routes/
      questionRoutes.ts      # API route definitions
    validation/
      schemas.ts             # Zod schemas for all endpoints
```

## Getting Started

1. Set up a Supabase project and obtain your credentials.
2. Create a `.env` file with your Supabase credentials:

   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3001
   CORS_ORIGIN=*
   ```

3. Run the database schema in your Supabase SQL editor:

   ```bash
   # Copy contents of supabase-schema.sql to Supabase SQL Editor
   ```

4. Install dependencies from repo root:

   ```bash
   npm install
   ```

5. Start the service:

   ```bash
   npm run dev --workspace question_service
   ```

   The API listens on `http://localhost:3001` by default.

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port for the question service. |
| `SUPABASE_URL` | (required) | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | (required) | Service role key for server-side access. |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (configure for production). |

## REST API Summary

| Method & Path | Description |
| --- | --- |
| `POST /api/v1/questions` | Create a new question (requires title, description, difficulty, topics). |
| `GET /api/v1/questions` | Get all questions with optional filters (title, difficulty, topic). |
| `GET /api/v1/questions/random` | Get a random question with optional difficulty/topic filters (used by matching service). |
| `GET /api/v1/questions/:id` | Get a specific question by ID. |
| `PUT /api/v1/questions/:id` | Update an existing question (partial updates supported). |
| `DELETE /api/v1/questions/:id` | Delete a question by ID. |

### Response Format

All questions return data in the following format:

```json
{
  "id": 1,
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target...",
  "difficulty": "Easy",
  "topic": "Array",
  "topics": ["Array", "Hash Table"],
  "image_url": "https://leetcode.com/problems/two-sum/",
  "createdAt": "2025-10-29T...",
  "updatedAt": "2025-10-29T..."
}
```

> Note: The `topic` field (singular) returns the first topic for compatibility with collaboration service, while `topics` contains the full array.

## Database Schema

```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  topics TEXT[] NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimized queries
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_topics ON questions USING GIN(topics);
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev --workspace question_service` | Start with hot reload via `ts-node`. |
| `npm run dev:watch --workspace question_service` | Start with auto-restart via `nodemon`. |
| `npm run build --workspace question_service` | TypeScript build to `dist/`. |
| `npm run start --workspace question_service` | Run the compiled build. |
| `npm run import-questions --workspace question_service` | Import LeetCode questions to database. |

## Importing Questions

To populate your database with 1000 LeetCode-style questions:

```bash
npm run import-questions --workspace question_service
```

This script will:
1. Delete all existing questions from the database
2. Reset the ID sequence to start from 1
3. Fetch 1000 free (non-premium) questions from the LeetCode API
4. Fetch detailed descriptions for the first 100 questions
5. Insert all questions in batches with proper error handling

**Note:** The import process takes approximately 5-10 minutes to complete due to API rate limiting.

## Validation

All endpoints use Zod for runtime type validation:

- **Title:** 1-200 characters
- **Description:** 10-5000 characters
- **Difficulty:** Must be one of `Easy`, `Medium`, or `Hard`
- **Topics:** Array of 1-10 strings (each 1-50 characters)
- **Image URL:** Optional valid URL

Invalid requests return 400 with detailed error messages:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "difficulty",
      "message": "Difficulty must be one of: Easy, Medium, Hard",
      "code": "invalid_enum_value"
    }
  ]
}
```

## Integration with Other Services

### Matching Service
The matching service calls `GET /api/v1/questions/random?difficulty={difficulty}` to select an appropriate question for matched users.

### Collaboration Service
The collaboration service uses the returned `topic` field (singular string) to identify the question category for the coding session.

### User Service
Future integration planned for question authorship, favorites, and completion tracking.

## What's Next

- Add question authorship and ownership tracking
- Implement user-specific question history and completion status
- Add test case storage and validation for questions
- Support for multiple programming languages per question
- Question difficulty rating based on user feedback
- Full-text search across question titles and descriptions
- Question versioning and edit history

## References

- Database schema: `supabase-schema.sql`
- Zod validation schemas: `src/validation/schemas.ts`
- Supabase documentation: https://supabase.com/docs
- LeetCode API: https://alfa-leetcode-api.onrender.com
