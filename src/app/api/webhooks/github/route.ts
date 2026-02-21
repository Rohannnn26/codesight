import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("x-github-event");
    const payload = await req.json();

    console.log(`[GitHub Webhook] Event: ${event}`, {
      repository: payload.repository?.full_name,
    });

    switch (event) {
      case "push":
        // TODO: trigger re-indexing for RAG on push
        console.log(`[GitHub Webhook] Push to ${payload.repository?.full_name} on ${payload.ref}`);
        break;

      case "pull_request":
        console.log(
          `[GitHub Webhook] PR #${payload.number} (${payload.action}) on ${payload.repository?.full_name}`
        );
        break;

      case "ping":
        console.log(`[GitHub Webhook] Ping from ${payload.repository?.full_name}`);
        break;

      default:
        console.log(`[GitHub Webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[GitHub Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
