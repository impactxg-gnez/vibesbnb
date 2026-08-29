# VibesBNB Mobile — Store Submission

Build and submit the iOS and Android apps with EAS. Complete [MOBILE_ACCOUNTS_CHECKLIST.md](./MOBILE_ACCOUNTS_CHECKLIST.md) first.

## One-time setup

```bash
cd apps/mobile
cp .env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
eas login
eas init
eas credentials
```

Update placeholders:

| File | Replace |
|------|---------|
| `app.config.ts` | `EAS_PROJECT_ID` in `extra.eas.projectId` |
| `eas.json` | Apple ID, ASC app ID, team ID |
| `apps/web/public/.well-known/apple-app-site-association` | `REPLACE_TEAM_ID` |
| `apps/web/public/.well-known/assetlinks.json` | SHA-256 from `eas credentials -p android` |

Deploy the web app so universal links resolve at `https://vibesbnb.com/.well-known/*`.

## Environment profiles

| Profile | Use |
|---------|-----|
| `development` | Dev client, iOS simulator |
| `preview` | TestFlight internal / Play internal APK |
| `production` | App Store + Play Store release |

## Build commands

```bash
cd apps/mobile

# Internal testing
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Store release
eas build --profile production --platform ios
eas build --profile production --platform android

# Both platforms
npm run build:production
```

## Submit commands

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production

# Or use npm scripts
npm run submit:ios
npm run submit:android
```

## TestFlight (iOS)

1. Upload production or preview build via `eas submit`.
2. App Store Connect → TestFlight → add internal testers.
3. Verify: login, browse, listing, web checkout, push on booking/message, host mode switch.

## Google Play internal testing

1. Upload AAB from production profile.
2. Play Console → Internal testing → create release.
3. Same test matrix as iOS.

## Store metadata checklist

### Apple App Store Connect

- **Name:** VibesBNB
- **Subtitle:** Wellness-friendly stays
- **Category:** Travel
- **Privacy policy:** https://vibesbnb.com/privacy
- **Support URL:** https://vibesbnb.com
- **Screenshots:** 6.7", 6.5", 5.5" iPhone (required)
- **App icon:** 1024×1024 (use `assets/images/icon.png` upscaled)
- **Age rating:** complete questionnaire (user-generated content, location)
- **Export compliance:** standard HTTPS only

### Google Play Console

- **Short description:** Book mindful stays and manage hosting on VibesBNB.
- **Full description:** Traveler + host app for the VibesBNB marketplace.
- **Privacy policy:** https://vibesbnb.com/privacy
- **Feature graphic:** 1024×500
- **Screenshots:** phone required
- **Data safety:** email, bookings, messages, device push token
- **Content rating:** IARC questionnaire

## Push credentials (EAS)

- **iOS:** Upload APNs key in Expo dashboard or `eas credentials -p ios`
- **Android:** FCM via EAS (google-services.json managed by Expo)

Ensure Vercel has `EXPO_ACCESS_TOKEN` for server-side push dispatch.

## Version bumps

Before each store release:

1. Bump `version` in `app.config.ts`
2. EAS `production` profile uses `autoIncrement` for build numbers
3. Rebuild and resubmit

## OTA updates (JS-only fixes)

```bash
eas update --branch production --message "Fix copy"
```

Native module changes require a new store build.

## QA matrix

- [ ] Traveler: search → listing → web checkout → booking appears
- [ ] Push: booking request / accept / message tap navigates correctly
- [ ] Host: dashboard, properties, accept/reject, payouts
- [ ] Role switch traveler ↔ host
- [ ] Logout / reinstall / push token re-register
- [ ] Universal link: `https://vibesbnb.com/listings/{id}` opens app
