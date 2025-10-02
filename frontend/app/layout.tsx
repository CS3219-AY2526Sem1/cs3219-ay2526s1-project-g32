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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
