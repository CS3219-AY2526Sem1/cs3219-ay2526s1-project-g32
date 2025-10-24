#!/usr/bin/env bash

# Enhanced test script for matching service with schema validation
echo "🧪 Testing Matching Service with Schema Validation"
echo "=================================================="

BASE_URL="http://localhost:3002/api/v1/matching"

echo ""
echo "1. Testing health endpoint..."
curl -s http://localhost:3002/ && echo ""

echo ""
echo "2. ✅ Testing valid match request..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1", "difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "3. ❌ Testing invalid difficulty (should fail validation)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user2", "difficulty": "Super Hard", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "4. ❌ Testing invalid topic (should fail validation)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user3", "difficulty": "Easy", "topic": "InvalidTopic"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "5. ❌ Testing missing userId (should fail validation)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "6. ❌ Testing invalid userId format (should fail validation)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user@invalid!", "difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "7. ✅ Testing valid second user (should match with user1)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user4", "difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "8. ✅ Testing valid status check..."
curl -X GET $BASE_URL/requests/user1/status \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "9. ❌ Testing invalid userId in URL (should fail validation)..."
curl -X GET $BASE_URL/requests/user@invalid!/status \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "10. ✅ Testing valid cancellation..."
curl -X DELETE $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user5", "topic": "Strings"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "11. ❌ Testing cancellation with invalid topic (should fail validation)..."
curl -X DELETE $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user6", "topic": "InvalidTopic"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🏁 Schema validation tests completed!"
echo ""
echo "Expected results:"
echo "- ✅ Valid requests should return 200/202 status codes"
echo "- ❌ Invalid requests should return 400 status codes with error details"