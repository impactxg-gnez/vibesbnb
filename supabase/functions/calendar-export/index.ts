/** Optional Edge proxy → Next ICS URL (prefer hitting Next directly). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const appUrl = (Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_ORIGIN") || "").replace(
    /\/$/,
    "",
  );
  if (!appUrl) {
    return new Response(JSON.stringify({ error: "Set NEXT_PUBLIC_APP_URL or APP_ORIGIN" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }

  const u = new URL(req.url);
  const propertyId = u.searchParams.get("propertyId");
  const token = u.searchParams.get("token");
  if (!propertyId || !token) {
    return new Response(JSON.stringify({ error: "propertyId and token required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = `${appUrl}/calendar/${encodeURIComponent(propertyId)}.ics?token=${encodeURIComponent(token)}`;
  const res = await fetch(target, {
    headers: { Accept: "text/calendar,*/*", "User-Agent": "Supabase-calendar-export-proxy/1" },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
