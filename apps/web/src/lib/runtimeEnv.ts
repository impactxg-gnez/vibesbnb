/**
 * Preview / sandbox detection. Production (`VERCEL_ENV=production`) stays indexed
 * and uses live credentials. Preview deployments and explicit sandbox env do not.
 */
export function isPreviewOrSandbox(): boolean {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase();
  if (appEnv === 'sandbox' || appEnv === 'preview') return true;

  const vercelEnv = (
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    ''
  )
    .trim()
    .toLowerCase();

  return vercelEnv === 'preview';
}
