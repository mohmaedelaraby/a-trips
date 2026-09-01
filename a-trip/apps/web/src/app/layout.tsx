import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../shared/styles/globals.css';
import { Providers } from '../shared/components/providers';

export const metadata: Metadata = {
  title: { default: 'A Trip — Egypt hotels, booked direct', template: '%s · A Trip' },
  description:
    'Book hotels across Egypt direct from the operator — real availability, no middleman markup.',
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
