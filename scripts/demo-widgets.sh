#!/usr/bin/env bash
# Demo script: Add sample widgets to services
# Usage: ./demo-widgets.sh [SERVICE_ID] [USER_ID]

set -e

SERVICE_ID=${1:-"your-service-id"}
USER_ID=${2:-"admin-user-id"}
BASE_URL=${NEXUS_API_URL:-"http://localhost:8080"}

echo "🎨 Adding demo widgets to service: $SERVICE_ID"
echo "🔑 Using User ID: $USER_ID"
echo ""

# 1. Add a metric widget
echo "📊 Adding metric widget..."
curl -X POST "$BASE_URL/api/services/$SERVICE_ID/widgets" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "type": "metric",
    "title": "Response Time",
    "content": {
      "value": "45",
      "unit": "ms"
    },
    "order": 1,
    "isVisible": true
  }' | jq .

# 2. Add an info widget
echo ""
echo "ℹ️  Adding info widget..."
curl -X POST "$BASE_URL/api/services/$SERVICE_ID/widgets" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "type": "info",
    "title": "About",
    "content": {
      "description": "This service handles authentication and user management. Uptime SLA: 99.9%"
    },
    "order": 2,
    "isVisible": true
  }' | jq .

# 3. Add a link widget
echo ""
echo "🔗 Adding link widget..."
curl -X POST "$BASE_URL/api/services/$SERVICE_ID/widgets" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "type": "link",
    "title": "Documentation",
    "content": {
      "url": "https://docs.example.com",
      "text": "View Docs"
    },
    "order": 3,
    "isVisible": true
  }' | jq .

# 4. Add a status badge widget
echo ""
echo "✅ Adding status widget..."
curl -X POST "$BASE_URL/api/services/$SERVICE_ID/widgets" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "type": "status",
    "title": "Environment",
    "content": {
      "status": "success",
      "message": "Production"
    },
    "order": 0,
    "isVisible": true
  }' | jq .

echo ""
echo "✨ Done! View your widgets at $BASE_URL"
echo ""
echo "📝 Fetch widgets with:"
echo "   curl $BASE_URL/api/services/$SERVICE_ID/widgets | jq ."
