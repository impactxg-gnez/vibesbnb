/** Optional Edge proxy → Next ICS URL (prefer hitting Next directly). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  const rawAppUrl = (Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_ORIGIN") || "").replace(
    /\/$/,
    "",
  );
  let appUrl = rawAppUrl;
  try {
    const host = rawAppUrl ? new URL(rawAppUrl).hostname.toLowerCase() : "";
    if (!rawAppUrl || host === "vercel.app" || host.endsWith(".vercel.app")) {
      appUrl = "https://vibesbnb.com";
    }
  } catch {
    appUrl = "https://vibesbnb.com";
  }
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
