import { NextRequest, NextResponse } from 'next/server';

// Inaktiverar middleware genom att inte matcha några sökvägar
export const config = {
  matcher: [], // Tom array betyder att middleware inte körs
};

export default async function middleware(req: NextRequest) {
  // Denna funktion kommer inte att anropas eftersom matchern är tom
  return NextResponse.next();
}
