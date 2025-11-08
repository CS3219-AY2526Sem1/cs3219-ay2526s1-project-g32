import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'antd/dist/reset.css';
import './globals.css';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'PeerPrep | Collaborative Coding Platform',
  description: 'PeerPrep lets you prepare for technical interviews with peers in real time.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Load Google Fonts via <link> to avoid CSS @import parsing in production */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
