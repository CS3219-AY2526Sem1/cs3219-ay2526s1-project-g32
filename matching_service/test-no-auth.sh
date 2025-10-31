#!/usr/bin/env bash

# Test script for matching service without authentication
echo "🧪 Testing Matching Service (No Authentication)"
echo "================================================"

BASE_URL="http://localhost:3002/api/v1/matching"

echo ""
echo "1. Testing health endpoint..."
curl -s http://localhost:3002/ && echo ""

echo ""
echo "2. Testing user1 queue request..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1", "difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "3. Testing user2 queue request (should match with user1)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user2", "difficulty": "Easy", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "4. Testing status check for user1..."
curl -X GET $BASE_URL/requests/user1/status \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "5. Testing user3 with different difficulty (should not match)..."
curl -X POST $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user3", "difficulty": "Hard", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "6. Testing cancellation for user3..."
curl -X DELETE $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user3", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "7. 🧹 Cleaning up test data..."
curl -X DELETE $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

curl -X DELETE $BASE_URL/requests \
  -H "Content-Type: application/json" \
  -d '{"userId": "user2", "topic": "Arrays"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🏁 Test completed and cleaned up!"