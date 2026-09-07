import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateSiteSettingsDto } from './dto/site-setting.dto';

/**
 * The site copy that is not hotel data: contact details, social links, the
 * currency label, the home page hero.
 *
 * Key/value rather than a wide table so adding a new editable string is a seed
 * row, not a migration. `label` travels with the row so the admin form can
 * render a field for a setting the portal has never heard of.
 */
export const SITE_SETTING_DEFAULTS: Array<{
  key: string;
  value: string;
  group: string;
  label: string;
}> = [
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

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Flat key/value map for the site to read.
   *
   * Defaults are merged underneath the stored rows, so a setting that has never
   * been saved still renders its shipped copy rather than a blank.
   */
  async publicMap(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    const map: Record<string, string> = {};
    for (const preset of SITE_SETTING_DEFAULTS) map[preset.key] = preset.value;
    for (const row of rows) map[row.key] = row.value;
    return map;
  }

  /** Admin list: every known setting, stored value or shipped default. */
  async list() {
    const rows = await this.prisma.siteSetting.findMany();
    const stored = new Map(rows.map((row) => [row.key, row]));

    const known = SITE_SETTING_DEFAULTS.map((preset) => ({
      key: preset.key,
      group: preset.group,
      label: preset.label,
      value: stored.get(preset.key)?.value ?? preset.value,
      isDefault: !stored.has(preset.key),
    }));

    // Anything stored that is no longer in the defaults still shows, so a
    // setting is never silently stranded in the database.
    const extra = rows
      .filter((row) => !SITE_SETTING_DEFAULTS.some((p) => p.key === row.key))
      .map((row) => ({
        key: row.key,
        group: row.group,
        label: row.label,
        value: row.value,
        isDefault: false,
      }));

    return [...known, ...extra];
  }

  /** Saves many settings at once — the admin form submits a whole group. */
  async update(dto: UpdateSiteSettingsDto) {
    const known = new Map(SITE_SETTING_DEFAULTS.map((p) => [p.key, p]));

    for (const entry of dto.settings) {
      const preset = known.get(entry.key);
      if (!preset) {
        const exists = await this.prisma.siteSetting.findUnique({ where: { key: entry.key } });
        if (!exists) throw new NotFoundException(`Unknown setting "${entry.key}"`);
      }
      await this.prisma.siteSetting.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          value: entry.value,
          group: preset?.group ?? 'general',
          label: preset?.label ?? entry.key,
        },
        update: { value: entry.value },
      });
    }

    return this.list();
  }

  /** Drops the stored override so the shipped default applies again. */
  async reset(key: string) {
    await this.prisma.siteSetting.deleteMany({ where: { key } });
    return this.list();
  }
}
