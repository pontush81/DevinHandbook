import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [], // Inaktivera alla matcher för att middleware inte ska köras
};

export default async function middleware(req: NextRequest) {
  // Denna funktion kommer inte att anropas eftersom matchern är tom
  return NextResponse.next();
}
