#!/bin/bash

# Script to create the ABC handbook using the API endpoint
# This is useful when direct database connections have issues

echo "Creating ABC handbook via API..."

# Define variables
API_URL="https://handbok.org/api/create-handbook"
API_KEY="handbok-secret-key"
SUBDOMAIN="abc"
NAME="ABC Handbook"

# Create the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "subdomain": "$SUBDOMAIN",
  "name": "$NAME"
}
EOF
)

# Make the API call
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$JSON_PAYLOAD" \
  -v

echo
echo "If successful, your handbook should be available at https://$SUBDOMAIN.handbok.org"
echo "Note: It may take a few minutes for DNS to propagate and the new handbook to be accessible." 