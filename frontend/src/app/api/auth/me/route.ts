import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
  });
}
