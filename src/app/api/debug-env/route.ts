import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'SET' : 'NOT SET',
      GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET (length: ' + process.env.GOOGLE_CLOUD_CREDENTIALS.length + ')' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      projectIdValue: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentialsPreview: process.env.GOOGLE_CLOUD_CREDENTIALS ? process.env.GOOGLE_CLOUD_CREDENTIALS.substring(0, 100) + '...' : 'NOT SET'
    };
    
    // Testa om JSON är giltigt
    let jsonValid = false;
    let jsonError = '';
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
        jsonValid = true;
        envCheck.jsonFields = {
          type: parsed.type || 'MISSING',
          project_id: parsed.project_id || 'MISSING',
          private_key_id: parsed.private_key_id ? 'SET' : 'MISSING',
          private_key: parsed.private_key ? 'SET (length: ' + parsed.private_key.length + ')' : 'MISSING',
          client_email: parsed.client_email || 'MISSING'
        };
      } catch (error) {
        jsonError = error instanceof Error ? error.message : 'Unknown JSON error';
      }
    }
    
    envCheck.jsonValid = jsonValid;
    if (jsonError) envCheck.jsonError = jsonError;
    
    console.log('Environment check:', envCheck);
    
    return NextResponse.json(envCheck);
    
  } catch (error) {
    console.error('Debug env error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 