import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
  });
}
