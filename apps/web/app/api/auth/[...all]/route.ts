import { getAuth } from "@/core/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    console.error("[Auth GET] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    console.error("[Auth POST] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}