#!/bin/bash
# Simple script to test Mux video webhook
# Usage: ./test-video-simple.sh 78 your-jwt-token

LESSON_ID=$1
TOKEN=$2
BASE_URL="http://localhost:5000"

if [ -z "$LESSON_ID" ]; then
    echo "❌ Error: Lesson ID is required"
    echo "Usage: ./test-video-simple.sh <lesson_id> <jwt_token>"
    exit 1
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Error: JWT token is required"
    echo "Usage: ./test-video-simple.sh <lesson_id> <jwt_token>"
    exit 1
fi

echo "🧪 Testing Mux Video Webhook for Lesson $LESSON_ID"
echo "================================================"
echo ""

curl -X POST "$BASE_URL/api/videos/mux/webhook/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lessonId\": $LESSON_ID}" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "💡 Check your backend console for detailed logs"
