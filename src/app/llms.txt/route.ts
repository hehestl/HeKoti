import { getLlmsTxtBody } from "@/lib/crawler-policy";

export async function GET() {
  const body = await getLlmsTxtBody();
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
