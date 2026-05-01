import { NextResponse } from "next/server";
export const runtime = "edge";
export async function GET(req: Request) {
  const headers = Object.fromEntries(req.headers.entries());
  return NextResponse.json({ headers });
}