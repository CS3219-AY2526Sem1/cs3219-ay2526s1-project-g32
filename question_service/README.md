# Question Service

Service responsible for managing coding questions, including CRUD operations, filtering by difficulty and topics, and providing random question selection for matching and collaboration services.

## Features Implemented

- **Question CRUD API** – Full create, read, update, and delete operations for coding questions with Zod validation.
- **Multi-language starter code** – Support for Python, C, C++, Java, and JavaScript starter code templates.
- **Advanced filtering** – Query questions by title, difficulty level, and topics with optimized database indexes.
- **Random question selection** – `GET /api/v1/questions/random` returns a random question based on optional difficulty and topic filters, used by matching service.
- **Supabase integration** – PostgreSQL database (questionsv3 table) hosted on Supabase with full TypeScript type safety.
- **CORS support** – Configured for cross-origin requests from frontend and other microservices.
- **Pino logging** – Structured JSON logging with configurable log levels for debugging and monitoring.

## Project Structure

```
question_service/
  index.ts                   # Service entrypoint (Express + Supabase connection)
  supabase-schema.sql        # Database schema with indexes and triggers
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
| `NODE_ENV` | `development` | Environment mode (development, production, test). |
| `SUPABASE_URL` | (required) | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | (required) | Service role key for server-side access. |
| `SUPABASE_ANON_KEY` | (optional) | Supabase anonymous key (not used by this service). |
| `SUPABASE_JWT_SECRET` | (optional) | JWT secret for token validation (not used by this service). |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins. |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Logging verbosity level. |

## REST API Summary

| Method & Path | Description |
| --- | --- |
| `POST /api/v1/questions` | Create a new question (requires title, description, difficulty, topics). |
| `GET /api/v1/questions` | Get all questions with optional filters (title, difficulty, topic). |
| `GET /api/v1/questions/random` | Get a random question with optional difficulty/topic filters (used by matching service). |
| `GET /api/v1/questions/slug/:slug` | Get a specific question by its slug (URL-friendly identifier). |
| `GET /api/v1/questions/:id` | Get a specific question by ID. |
| `PUT /api/v1/questions/:id` | Update an existing question (partial updates supported). |
| `DELETE /api/v1/questions/:id` | Delete a question by ID. |

### Response Format

All questions return data in the following format:

```json
{
  "id": 1,
  "title": "Two Sum",
  "slug": "two-sum",
  "description": "Given an array of integers nums and an integer target...",
  "difficulty": "Easy",
  "topic": "Array",
  "topics": ["Array", "Hash Table"],
  "starterCode": {
    "python": "def twoSum(nums: List[int], target: int) -> List[int]:\n    pass",
    "c": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}",
    "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
    "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
    "javascript": "var twoSum = function(nums, target) {\n    \n};"
  }
}
```

> **Note:** The `topic` field (singular) returns the first topic for compatibility with collaboration service, while `topics` contains the full array. Image URLs are embedded in the description field.

### API Usage Examples

#### Get Question by Slug
```bash
# Request
GET /api/v1/questions/slug/two-sum

# Response (200 OK)
{
  "id": 1,
  "title": "Two Sum",
  "slug": "two-sum",
  "description": "Given an array of integers...",
  "difficulty": "Easy",
  "topics": ["Array", "Hash Table"],
  "starterCode": { ... }
}

# Not Found (404)
{
  "error": "Question not found"
}
```

#### Get Question by ID
```bash
# Request
GET /api/v1/questions/1

# Response (200 OK)
{
  "id": 1,
  "title": "Two Sum",
  "slug": "two-sum",
  ...
}
```

#### Get Random Question
```bash
# Request
GET /api/v1/questions/random?difficulty=Medium&topic=Array

# Response (200 OK)
{
  "id": 42,
  "title": "Product of Array Except Self",
  "topic": "Array",
  "topics": ["Array", "Prefix Sum"],
  ...
}
```

## Database Schema

The service uses the `questionsv3` table in Supabase:

```sql
CREATE TABLE questionsv3 (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL,
  topics TEXT[] NOT NULL,
  description TEXT NOT NULL,
  starter_python TEXT,
  starter_c TEXT,
  starter_cpp TEXT,
  starter_java TEXT,
  starter_javascript TEXT
);

-- Indexes for optimized queries
CREATE INDEX idx_questionsv3_difficulty ON questionsv3(difficulty);
CREATE INDEX idx_questionsv3_topics ON questionsv3 USING GIN(topics);
CREATE INDEX idx_questionsv3_slug ON questionsv3(slug);
```

**Key Changes from Previous Schema:**
- Table name: `questions` → `questionsv3`
- Added `slug` field for URL-friendly identifiers
- Added starter code fields for 5 programming languages
- Removed `image_url` column (URLs now embedded in description)
- Removed timestamp columns (`created_at`, `updated_at`)
- Changed `title` and `difficulty` from VARCHAR to TEXT

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

### Request Body Validation

- **Title:** Required, minimum 1 character
- **Slug:** Required, minimum 1 character, URL-friendly format (lowercase alphanumeric with hyphens)
- **Description:** Required, minimum 10 characters
- **Difficulty:** Required, must be one of: `Easy`, `Medium`, or `Hard`
- **Topics:** Array of 1-10 strings (each 1-50 characters)
- **Starter Code:** Optional text fields for Python, C, C++, Java, and JavaScript

### URL Parameter Validation

- **ID Parameter** (`/:id`): Must be a positive integer
- **Slug Parameter** (`/slug/:slug`): Must be lowercase alphanumeric with hyphens only (e.g., `two-sum`, `reverse-linked-list`), maximum 100 characters

### Query Parameter Validation

- **Difficulty Filter** (`?difficulty=`): Must be `Easy`, `Medium`, or `Hard`
- **Topic Filter** (`?topic=`): String value
- **Limit** (`?limit=`): Positive integer between 1 and 100
- **Offset** (`?offset=`): Non-negative integer

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
The collaboration service receives:
- The `topic` field (singular string) to identify the question category
- The `starterCode` object with language-specific templates for the collaborative editor
- The full question description with embedded image URLs

### User Service
Future integration planned for question authorship, favorites, and completion tracking.

## Topic Parsing

The service handles topics stored in multiple formats:
- **PostgreSQL Array:** `{"Array", "Hash Table"}`
- **JSON String:** `"[\"Array\", \"Hash Table\"]"`
- **Single String:** `"Array"`

The `parseTopics()` helper function automatically detects and parses the format, ensuring consistent array output regardless of storage format.

## Recent Updates (November 2025)

- **Added slug endpoint validation** with Zod schema to ensure proper slug format (lowercase, hyphens, alphanumeric)
- **Added GET by slug endpoint** (`GET /api/v1/questions/slug/:slug`) for retrieving questions by URL-friendly identifiers
- **Migrated to questionsv3 table** with improved schema design
- **Added multi-language starter code** support (Python, C, C++, Java, JavaScript)
- **Added slug field** for URL-friendly question identifiers
- **Removed timestamps** (created_at, updated_at) to simplify schema
- **Embedded image URLs** in description instead of separate column
- **Added Pino structured logging** for better observability
- **Fixed query parameter validation** to handle empty requests
- **Improved topic parsing** to handle multiple storage formats

## What's Next

- Add question authorship and ownership tracking
- Implement user-specific question history and completion status
- Add test case storage and validation for questions
- Support for additional programming languages (Go, Rust, TypeScript, etc.)
- Question difficulty rating based on user feedback
- Full-text search across question titles and descriptions
- Question versioning and edit history
- Enhanced LeetCode import with all descriptions and solution hints

## References

- Database schema: `supabase-schema.sql`
- Zod validation schemas: `src/validation/schemas.ts`
- Supabase documentation: https://supabase.com/docs
- LeetCode API: https://alfa-leetcode-api.onrender.com
