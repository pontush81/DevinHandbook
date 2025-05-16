const fs = require('fs');
const path = require('path');

// Path to the .env.local file
const envFilePath = path.join(__dirname, '.env.local');

// Check if the file exists
if (!fs.existsSync(envFilePath)) {
  console.error('Error: .env.local file not found.');
  process.exit(1);
}

// Read the file content
let envContent = fs.readFileSync(envFilePath, 'utf8');

// Check for placeholder values
const hasPlaceholderUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url.supabase.co');
const hasPlaceholderAnonKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key');
const hasPlaceholderServiceKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key');

if (hasPlaceholderUrl || hasPlaceholderAnonKey || hasPlaceholderServiceKey) {
  console.log('Found placeholder Supabase values in .env.local file.');
  console.log('Please update your Supabase configuration in .env.local with actual values from your Supabase project dashboard.');
  console.log('');
  console.log('For reference, Supabase URLs and keys should look like:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-value');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-value');
  console.log('');
  console.log('You can find these values in your Supabase project dashboard under:');
  console.log('Settings > API');
} else {
  // Check if URL has https:// prefix
  let updated = false;
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]*)/);
  
  if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('http')) {
    const oldUrl = urlMatch[1];
    const newUrl = `https://${oldUrl}`;
    envContent = envContent.replace(`NEXT_PUBLIC_SUPABASE_URL=${oldUrl}`, `NEXT_PUBLIC_SUPABASE_URL=${newUrl}`);
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(envFilePath, envContent);
    console.log('Updated .env.local with HTTPS prefix for Supabase URL.');
  } else {
    console.log('Supabase configuration looks good.');
  }
}

console.log('');
console.log('After updating your .env.local file, restart your Next.js server:');
console.log('1. Stop the current server with Ctrl+C');
console.log('2. Run: npm run dev'); 