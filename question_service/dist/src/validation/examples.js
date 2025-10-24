"use strict";
// Test file to demonstrate Zod validation
// Run this with: npm run dev and test with curl or Postman
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationExamples = void 0;
/*
Example valid request:
POST http://localhost:3001/questions
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "difficulty": "Easy",
  "topics": ["Array", "Hash Table"],
  "image_url": "https://example.com/image.png"
}

Example invalid requests that will be caught by Zod:

1. Missing title:
POST http://localhost:3001/questions
{
  "description": "Some description",
  "difficulty": "Easy",
  "topics": ["Array"]
}
Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required",
      "code": "too_small"
    }
  ]
}

2. Invalid difficulty:
POST http://localhost:3001/questions
{
  "title": "Test Question",
  "description": "Some description",
  "difficulty": "Super Hard",
  "topics": ["Array"]
}
Response: 400 Bad Request
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

3. Invalid URL:
POST http://localhost:3001/questions
{
  "title": "Test Question",
  "description": "Some description",
  "difficulty": "Easy",
  "topics": ["Array"],
  "image_url": "not-a-url"
}
Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "image_url",
      "message": "Invalid URL format",
      "code": "invalid_string"
    }
  ]
}

4. Empty topics array:
POST http://localhost:3001/questions
{
  "title": "Test Question",
  "description": "Some description",
  "difficulty": "Easy",
  "topics": []
}
Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "topics",
      "message": "At least one topic is required",
      "code": "too_small"
    }
  ]
}

5. Invalid ID parameter:
GET http://localhost:3001/questions/abc
Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "ID must be a positive number",
      "code": "invalid_string"
    }
  ]
}
*/
exports.ZodValidationExamples = {
    validCreateRequest: {
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        difficulty: "Easy",
        topics: ["Array", "Hash Table"],
        image_url: "https://example.com/image.png"
    },
    validUpdateRequest: {
        title: "Updated Two Sum",
        difficulty: "Medium"
    },
    invalidRequests: {
        missingTitle: {
            description: "Some description",
            difficulty: "Easy",
            topics: ["Array"]
        },
        invalidDifficulty: {
            title: "Test Question",
            description: "Some description",
            difficulty: "Super Hard",
            topics: ["Array"]
        },
        invalidUrl: {
            title: "Test Question",
            description: "Some description",
            difficulty: "Easy",
            topics: ["Array"],
            image_url: "not-a-url"
        }
    }
};
