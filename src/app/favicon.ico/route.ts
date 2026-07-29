import { NextResponse } from "next/server";

export function GET(req: Request) {
  return NextResponse.redirect(new URL("/rarostock-logo.png?v=3", req.url));
}
