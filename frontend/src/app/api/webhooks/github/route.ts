import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256") || "";
    const rawBody = await req.text();

    console.log(`[GitHub Webhook] Event: ${event}`);

    // Forward the webhook to the Python backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/webhooks/github`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": event || "",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    const result = await backendResponse.json();

    console.log(`[GitHub Webhook] Backend response:`, result);

    return NextResponse.json(result, { status: backendResponse.status });
  } catch (error) {
    console.error("[GitHub Webhook] Error forwarding to backend:", error);

    // Return 200 to GitHub so it doesn't retry, but log the error
    return NextResponse.json(
      { error: "Failed to forward to backend", received: true },
      { status: 200 }
    );
  }
}
