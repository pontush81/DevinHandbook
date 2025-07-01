import { NextRequest } from 'next/server';
import { getCSRFTokenResponse } from '@/lib/csrf-utils';

export async function GET(request: NextRequest) {
  return getCSRFTokenResponse();
}