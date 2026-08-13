import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web-only document metadata for the installable Safari experience. */
export default function RootHtml({ children }: PropsWithChildren) {
  const configuredBaseUrl = process.env.EXPO_BASE_URL || '/';
  const baseUrl = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`;

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pocket Dev" />
        <link rel="manifest" href={`${baseUrl}manifest.json`} />
        <link rel="apple-touch-icon" href={`${baseUrl}favicon.ico`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
