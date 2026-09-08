import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import '../shared/styles/globals.css';
import { Providers } from '../shared/components/providers';
import { fetchSiteContent } from '../shared/lib/site-content.server';
import { LOCALE_COOKIE, LOCALE_META, normalizeLocale } from '../shared/i18n/config';

export const metadata: Metadata = {
  title: { default: 'A Trip — Egypt hotels, booked direct', template: '%s · A Trip' },
  description:
    'Book hotels across Egypt direct from the operator — real availability, no middleman markup.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Locale is resolved on the server so the first paint is already in the right
  // language and direction — no flash of English, and `dir` is correct for
  // screen readers and for CSS logical properties from the very first byte.
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const meta = LOCALE_META[locale];

  // The site chrome is identical for every visitor in a given locale, so it is
  // fetched once here and handed to the client cache: one upstream call per
  // locale, shared across visitors rather than per session.
  const siteContent = await fetchSiteContent(locale);

  return (
    <html lang={meta.htmlLang} dir={meta.dir}>
      <body>
        <Providers siteContent={siteContent} locale={locale}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
