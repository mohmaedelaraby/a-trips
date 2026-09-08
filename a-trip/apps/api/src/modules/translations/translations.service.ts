import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Locale } from '../../generated/prisma/enums';
import type { UpdateTranslationsDto } from './dto/translation.dto';

/** Locale used when a key has no row for the one requested. */
export const FALLBACK_LOCALE: Locale = Locale.EN;

export const LOCALES: Locale[] = [Locale.EN, Locale.AR];

/** Right-to-left locales, so the site can set `dir` correctly. */
export const RTL_LOCALES: Locale[] = [Locale.AR];

/** Namespaces the admin screen groups keys by. */
export const TRANSLATION_NAMESPACES = ['ui', 'nav', 'setting', 'hotel'] as const;

@Injectable()
export class TranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every override for one locale, as a flat map.
   *
   * English rows are merged underneath the requested locale, so a key that has
   * not been translated yet shows its English wording rather than a raw key.
   * The web app then layers its shipped JSON beneath both, which is what makes
   * a brand-new key readable before anyone has touched the admin screen.
   */
  async mapFor(locale: Locale): Promise<Record<string, string>> {
    const rows = await this.prisma.translation.findMany({
      where: locale === FALLBACK_LOCALE ? { locale } : { locale: { in: [FALLBACK_LOCALE, locale] } },
      select: { key: true, locale: true, value: true },
    });

    const map: Record<string, string> = {};
    // English first, then the requested locale overwrites it.
    for (const row of rows) {
      if (row.locale === FALLBACK_LOCALE) map[row.key] = row.value;
    }
    for (const row of rows) {
      if (row.locale === locale) map[row.key] = row.value;
    }
    return map;
  }

  /**
   * Resolves one key for a locale without a round trip per key — callers that
   * need many should use `mapFor` and read from the result.
   */
  localize(map: Record<string, string>, key: string, fallback: string): string {
    const value = map[key];
    return value === undefined || value === '' ? fallback : value;
  }

  // ----------------------------------------------------------------- admin

  /**
   * Every known key with its value in each locale, for the translation editor.
   *
   * `keys` comes from the caller (the web app knows its own UI keys, the API
   * knows its entities), unioned with whatever is already stored, so a key is
   * never editable-but-invisible or stored-but-orphaned.
   */
  async listForEditor(knownKeys: Array<{ key: string; context?: string }> = []) {
    const rows = await this.prisma.translation.findMany({
      orderBy: [{ key: 'asc' }],
    });

    const byKey = new Map<string, Partial<Record<Locale, string>>>();
    for (const row of rows) {
      const entry = byKey.get(row.key) ?? {};
      entry[row.locale] = row.value;
      byKey.set(row.key, entry);
    }

    const contexts = new Map(knownKeys.map((k) => [k.key, k.context]));
    const allKeys = [...new Set([...knownKeys.map((k) => k.key), ...byKey.keys()])].sort();

    return allKeys.map((key) => ({
      key,
      namespace: key.split('.')[0],
      context: contexts.get(key) ?? null,
      values: Object.fromEntries(
        LOCALES.map((locale) => [locale, byKey.get(key)?.[locale] ?? '']),
      ) as Record<Locale, string>,
      /** True when nothing is stored for any locale — the shipped copy applies. */
      isDefault: !byKey.has(key),
    }));
  }

  /** Bulk upsert; an empty value deletes the row so the default applies again. */
  async update(dto: UpdateTranslationsDto) {
    for (const entry of dto.translations) {
      const value = entry.value.trim();
      if (!value) {
        await this.prisma.translation.deleteMany({
          where: { key: entry.key, locale: entry.locale },
        });
        continue;
      }
      await this.prisma.translation.upsert({
        where: { key_locale: { key: entry.key, locale: entry.locale } },
        create: { key: entry.key, locale: entry.locale, value },
        update: { value },
      });
    }
    return { updated: dto.translations.length };
  }
}
