import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
    
    const debug = {
      currentWorkingDirectory: process.cwd(),
      credentialsPath: credentialsPath,
      fileExists: fs.existsSync(credentialsPath),
      filesInRoot: fs.readdirSync(process.cwd()).filter(f => f.includes('google') || f.includes('credential')),
      allJsonFiles: fs.readdirSync(process.cwd()).filter(f => f.endsWith('.json'))
    };

    if (debug.fileExists) {
      try {
        const fileContent = fs.readFileSync(credentialsPath, 'utf8');
        debug.fileSize = fileContent.length;
        debug.isValidJson = true;
        const parsed = JSON.parse(fileContent);
        debug.hasRequiredFields = {
          type: !!parsed.type,
          project_id: !!parsed.project_id,
          private_key: !!parsed.private_key,
          client_email: !!parsed.client_email
        };
      } catch (error) {
        debug.isValidJson = false;
        debug.jsonError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    console.log('OCR Debug:', debug);
    return NextResponse.json(debug);

  } catch (error) {
    console.error('Debug OCR error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 