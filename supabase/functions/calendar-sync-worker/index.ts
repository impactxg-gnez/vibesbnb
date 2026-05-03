/**
 * Optional Edge Function — forwards to your Next.js cron route so Supabase Scheduled Triggers
 * don't need Postgres pg_cron. Set env vars in Supabase Dashboard for this function:
 *   CALENDAR_CRON_HOOK_URL = https://<your-deployment>/api/cron/calendar-sync-batch
 *   CALENDAR_CRON_SECRET  = same as CALENDAR_CRON_SECRET / CRON_SECRET in Vercel
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_req: Request): Promise<Response> => {
  const hook = Deno.env.get("CALENDAR_CRON_HOOK_URL");
  const secret = Deno.env.get("CALENDAR_CRON_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "";
  if (!hook || !secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Set CALENDAR_CRON_HOOK_URL and CALENDAR_CRON_SECRET on this Edge Function deployment.",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }

  const res = await fetch(hook, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
});
