import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../shared/styles/globals.css';
import { Providers } from '../shared/components/providers';
import { fetchSiteContent } from '../shared/lib/site-content.server';

export const metadata: Metadata = {
  title: { default: 'A Trip — Egypt hotels, booked direct', template: '%s · A Trip' },
  description:
    'Book hotels across Egypt direct from the operator — real availability, no middleman markup.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The site chrome is identical for every visitor, so it is fetched once here
  // and handed to the client cache. That keeps the nav and copy in the
  // server-rendered HTML (crawlable, no placeholder flash) while still costing
  // exactly one upstream call, shared across visitors rather than per session.
  const siteContent = await fetchSiteContent();

  return (
    <html lang="en">
      <body>
        <Providers siteContent={siteContent}>{children}</Providers>
      </body>
    </html>
  );
}
