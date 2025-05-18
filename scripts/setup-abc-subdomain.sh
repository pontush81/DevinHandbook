#!/bin/bash

# Script för att sätta upp och testa ABC-subdomänen för Handbok.org

echo "====== ABC SUBDOMAIN SETUP ======"
echo "This script will help you set up and test the ABC subdomain for Handbok.org"

# Step 1: Check environment variables
echo -e "\n1. Checking environment variables..."
if [ ! -f .env.local ]; then
  echo "⚠️  .env.local file not found. Creating a template..."
  cp env.local.template .env.local
  echo "✅ Created .env.local template file. Please edit it with your Supabase credentials."
  exit 1
else
  echo "✅ .env.local file found."
fi

# Check for Supabase environment variables
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
  echo "✅ Supabase environment variables found."
else
  echo "⚠️  Supabase environment variables missing or incomplete."
  echo "Please ensure your .env.local file contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# Step 2: Check local hosts file
echo -e "\n2. Checking local hosts file setup..."
if grep -q "abc.handbok.org" /etc/hosts; then
  echo "✅ abc.handbok.org entry found in hosts file."
else
  echo "⚠️  abc.handbok.org entry not found in hosts file."
  echo "You may need to manually add this entry to /etc/hosts:"
  echo "127.0.0.1    abc.handbok.org"
  
  read -p "Would you like to add this entry now? (requires sudo, y/n): " add_host
  if [[ $add_host == "y" || $add_host == "Y" ]]; then
    echo "127.0.0.1    abc.handbok.org" | sudo tee -a /etc/hosts > /dev/null
    echo "✅ Added abc.handbok.org to hosts file."
  else
    echo "Skipping hosts file modification."
  fi
fi

# Step 3: Create the ABC handbook in the database
echo -e "\n3. Creating ABC handbook in the database..."
echo "Choose creation method:"
echo "1) Node script (for local development)"
echo "2) API endpoint (works for both local and production)"
read -p "Enter your choice (1/2): " creation_method

if [[ $creation_method == "1" ]]; then
  echo "Running Node script to create ABC handbook..."
  node scripts/create-abc-handbook.js
elif [[ $creation_method == "2" ]]; then
  echo "Using API endpoint to create ABC handbook..."
  curl -s http://localhost:3000/api/create-abc-direct | json_pp
else
  echo "Invalid choice. Exiting."
  exit 1
fi

# Step 4: Test subdomain access
echo -e "\n4. Testing subdomain access..."
node scripts/test-subdomain.js abc

# Step 5: Instructions for deployment
echo -e "\n5. Deployment instructions:"
echo "To make this work in production, you need to:"
echo "1) Deploy your app to Vercel with: npx vercel --prod"
echo "2) Ensure you have DNS wildcard record for *.handbok.org pointing to your Vercel deployment"
echo "3) In Vercel, add *.handbok.org as a wildcard domain in your project settings"
echo "4) Test your production subdomain by visiting: https://abc.handbok.org"

# Step 6: Local development
echo -e "\n6. For local development:"
echo "Start your development server with: npm run dev"
echo "Then visit: http://abc.handbok.org:3000 in your browser"

echo -e "\n====== SETUP COMPLETE ======"
echo "ABC subdomain should now be configured for testing!" 