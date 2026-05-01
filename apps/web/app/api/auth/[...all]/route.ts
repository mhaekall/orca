import { getAuth } from "@/core/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function setCorsHeaders(res: Response, req: NextRequest): Response {
  const origin = req.headers.get("origin") || "";
  
  // Izinkan request dari Web, Localhost, dan Capacitor Android/iOS
  const allowedOrigins = [
    "https://orcanime.pages.dev",
    "http://localhost:3000",
    "https://localhost",
    "capacitor://localhost"
  ];

  if (allowedOrigins.includes(origin) || origin.endsWith("pages.dev")) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  }

  return res;
}

export async function GET(request: NextRequest) {
  const response = await getAuth().handler(request);
  return setCorsHeaders(response, request);
}

export async function POST(request: NextRequest) {
  const response = await getAuth().handler(request);
  return setCorsHeaders(response, request);
}

export async function OPTIONS(request: NextRequest) {
  // Preflight request response for CORS
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, request);
}