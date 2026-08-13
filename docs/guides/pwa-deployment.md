# Safari PWA deployment

Pocket Dev can be published as a static Expo web application. The deployed site is independent of Metro, Expo Go, and the development computer.

## Architecture

- Expo Router exports the existing React Native screens as a static web site in `dist/`.
- The browser calls the Jules REST API directly over HTTPS.
- Jules supports the browser preflight request for `x-goog-api-key`; no CORS proxy is required.
- Each user enters their own Jules API key in Settings. The key is never placed in source code, environment variables, or the static build.
- Native builds continue to use Expo SecureStore. On the web, browser local storage is used because Safari has no Keychain-equivalent API for websites.

Do not use a shared browser profile and do not enter an API key on a device you do not control. Clearing Safari website data removes the locally saved key.

## Build locally

```bash
bun install
bun run build:web
```

The deployable static site is generated in `dist/`.

## Deploy with Vercel

1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
3. Import this GitHub repository.
4. Keep the detected `vercel.json` settings and deploy.
5. Open the generated `https://` URL on the iPhone in Safari.
6. Tap **Share → Add to Home Screen → Add**.

Vercel rebuilds the static PWA after each push to the connected branch. No API-key environment variable is needed or supported for this app.

## iPhone use

The PWA manifest configures standalone display. After adding it to the Home Screen, Pocket Dev opens without Safari's regular browser controls. An internet connection is still required because Jules runs in Google-hosted infrastructure and its REST API is online-only.
