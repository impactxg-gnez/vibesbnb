# VibesBNB Mobile — Accounts & Backend Prep

Complete these before first TestFlight / Play internal build.

## Developer accounts

- [ ] **Apple Developer Program** — https://developer.apple.com ($99/yr)
- [ ] **Google Play Console** — https://play.google.com/console ($25 one-time)
- [ ] **Expo account** — https://expo.dev
- [ ] Install EAS CLI: `npm i -g eas-cli` then `eas login`

## Supabase

Run in SQL Editor (production project):

```
apps/web/SUPABASE_DEVICE_PUSH_TOKENS.sql
```

## Vercel (production `vibesbnb-web`)

| Key | Source |
|-----|--------|
| `EXPO_ACCESS_TOKEN` | Expo dashboard → Access tokens |

## Mobile env

Copy `.env.example` to `.env` in this folder.

## EAS

```bash
cd apps/mobile
eas init
eas credentials
```

See [STORE_SUBMISSION.md](./STORE_SUBMISSION.md) for build and submit commands.
