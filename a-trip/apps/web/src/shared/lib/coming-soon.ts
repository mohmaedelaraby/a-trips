/**
 * Nav entries for features that are not built yet used to render as dimmed,
 * unclickable spans, which reads as a broken link rather than a deliberate
 * gap. They now point at /coming-soon, which names the feature it was reached
 * from and sends the visitor back to what does work.
 */
export const COMING_SOON_PATH = '/coming-soon';

/** Builds the href for a not-yet-built feature, e.g. `/coming-soon?feature=Tours`. */
export function comingSoonHref(feature: string): string {
  return `${COMING_SOON_PATH}?feature=${encodeURIComponent(feature)}`;
}

/**
 * Copy for the features that have their own dimmed entry somewhere in the nav.
 * Anything not listed falls back to generic wording, so adding a dimmed link
 * never requires touching this map.
 */
export const COMING_SOON_COPY: Record<string, { title: string; description: string }> = {
  About: {
    title: 'About ATrips',
    description:
      'The story behind ATrips — who we are, the hotels we hand-pick, and why we sell them direct at local rates.',
  },
  'About ATrips': {
    title: 'About ATrips',
    description:
      'The story behind ATrips — who we are, the hotels we hand-pick, and why we sell them direct at local rates.',
  },
  Contact: {
    title: 'Contact us',
    description:
      'A proper contact form is on the way. Until then, reach the reservations desk on the details in the footer.',
  },
  'Contact us': {
    title: 'Contact us',
    description:
      'A proper contact form is on the way. Until then, reach the reservations desk on the details in the footer.',
  },
  Tours: {
    title: 'Tours',
    description:
      'Guided day trips and multi-day itineraries, bookable alongside your room. Hotels come first — tours follow.',
  },
  Flights: {
    title: 'Flights',
    description:
      'Flight search and hotel-plus-flight bundles. We are getting the hotel experience right before adding air.',
  },
  Careers: {
    title: 'Careers',
    description: 'Open roles will be listed here once the team starts hiring.',
  },
  'Partner with us': {
    title: 'Partner with us',
    description:
      'Hotel owners will be able to apply to join ATrips from this page and manage their own listings.',
  },
  'Help centre': {
    title: 'Help centre',
    description: 'Searchable answers to the questions guests ask most, from booking to check-in.',
  },
  'Booking policy': {
    title: 'Booking policy',
    description: 'The full policy that applies to every reservation made through ATrips.',
  },
  Cancellation: {
    title: 'Cancellation policy',
    description:
      'Detailed cancellation terms per rate. Your booking confirmation already carries the terms that apply to it.',
  },
  'Terms & privacy': {
    title: 'Terms & privacy',
    description: 'Our terms of service and privacy notice, in full.',
  },
  'Saved hotels': {
    title: 'Saved hotels',
    description:
      'Shortlist the hotels you are weighing up and come back to them later, from any device you sign in on.',
  },
  Password: {
    title: 'Change password',
    description:
      'Changing your own password from the account area is coming. For now, use the reset link on the sign-in page.',
  },
};
