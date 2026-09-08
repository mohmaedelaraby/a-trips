/**
 * The site copy that is not hotel data: contact details, social links, the
 * currency label, the home page hero.
 *
 * Key/value rather than a wide table so adding a new editable string is a seed
 * row, not a migration. `label` travels with the row so the admin form can
 * render a field for a setting the portal has never heard of.
 */
export interface SiteSettingPreset {
  key: string;
  value: string;
  group: string;
  label: string;
}

export const SITE_SETTING_DEFAULTS: SiteSettingPreset[] = [
  { key: 'contact.phone', value: '+20 100 000 0000', group: 'contact', label: 'Phone' },
  { key: 'contact.email', value: 'hello@atrips.com', group: 'contact', label: 'Email' },
  { key: 'contact.address', value: 'Zamalek, Cairo', group: 'contact', label: 'Address' },
  { key: 'contact.hours', value: 'Sun–Thu, 9:00–18:00', group: 'contact', label: 'Opening hours' },

  { key: 'social.facebook', value: '', group: 'social', label: 'Facebook URL' },
  { key: 'social.instagram', value: '', group: 'social', label: 'Instagram URL' },
  { key: 'social.linkedin', value: '', group: 'social', label: 'LinkedIn URL' },

  {
    key: 'footer.tagline',
    value: 'Hand-picked hotels across Egypt, booked direct at local rates.',
    group: 'footer',
    label: 'Footer tagline',
  },
  {
    key: 'footer.legal',
    value: 'Prices in USD, incl. taxes unless stated.',
    group: 'footer',
    label: 'Footer small print',
  },

  { key: 'site.currencyLabel', value: 'USD $', group: 'general', label: 'Currency label' },

  {
    key: 'home.heroTitle',
    value: 'Find your next stay in Egypt',
    group: 'home',
    label: 'Home hero heading',
  },
  {
    key: 'home.heroSubtitle',
    value: 'Real availability, booked direct — no middleman markup.',
    group: 'home',
    label: 'Home hero subheading',
  },
];

export const SITE_SETTING_PRESETS_BY_KEY = new Map(
  SITE_SETTING_DEFAULTS.map((preset) => [preset.key, preset]),
);

export interface SiteSettingRow {
  key: string;
  value: string;
  group: string;
  label: string;
}

/**
 * Merges stored rows over the shipped defaults.
 *
 * A setting that has never been saved still renders its shipped copy rather than
 * a blank — which is what lets a new default ship without a data migration.
 */
export function mergeSettingsMap(rows: Array<{ key: string; value: string }>) {
  const map: Record<string, string> = {};
  for (const preset of SITE_SETTING_DEFAULTS) map[preset.key] = preset.value;
  for (const row of rows) map[row.key] = row.value;
  return map;
}

/**
 * The admin list: every known setting, stored value or shipped default.
 *
 * Anything stored that is no longer in the defaults still shows, so a setting is
 * never silently stranded in the database where no one can find or clear it.
 */
export function buildSettingsList(rows: SiteSettingRow[]) {
  const stored = new Map(rows.map((row) => [row.key, row]));

  const known = SITE_SETTING_DEFAULTS.map((preset) => ({
    key: preset.key,
    group: preset.group,
    label: preset.label,
    value: stored.get(preset.key)?.value ?? preset.value,
    isDefault: !stored.has(preset.key),
  }));

  const extra = rows
    .filter((row) => !SITE_SETTING_PRESETS_BY_KEY.has(row.key))
    .map((row) => ({
      key: row.key,
      group: row.group,
      label: row.label,
      value: row.value,
      isDefault: false,
    }));

  return [...known, ...extra];
}
