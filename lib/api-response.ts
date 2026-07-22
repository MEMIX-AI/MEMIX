import { NextResponse } from "next/server";

// Every /api/v1/* response is one of these two shapes — never a bare
// array or a mixed success/error object.
export function apiData(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
