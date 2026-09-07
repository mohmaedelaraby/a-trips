import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../shared/styles/globals.css';
import { Providers } from '../shared/components/providers';
import { fetchFooterLinks } from '../shared/lib/footer-links.server';

export const metadata: Metadata = {
  title: { default: 'A Trip — Egypt hotels, booked direct', template: '%s · A Trip' },
  description:
    'Book hotels across Egypt direct from the operator — real availability, no middleman markup.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Footer links are identical for every visitor, so they are fetched once here
  // and handed to the client cache. That keeps them in the server-rendered HTML
  // (crawlable, no placeholder flash) while still costing exactly one upstream
  // call, shared across visitors rather than one per session.
  const footerLinks = await fetchFooterLinks();

  return (
    <html lang="en">
      <body>
        <Providers footerLinks={footerLinks}>{children}</Providers>
      </body>
    </html>
  );
}
