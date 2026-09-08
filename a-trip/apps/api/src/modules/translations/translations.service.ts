import { Injectable } from '@nestjs/common';
import { Locale } from '../../generated/prisma/enums';
import { TranslationsRepository } from './repositories/translations.repository';
import { LOCALES, buildTranslationMap, localize, namespaceOf } from './utils/locale.util';
import type { UpdateTranslationsDto } from './dto/translation.dto';

export {
  FALLBACK_LOCALE,
  LOCALES,
  RTL_LOCALES,
  TRANSLATION_NAMESPACES,
} from './utils/locale.util';

@Injectable()
export class TranslationsService {
  constructor(private readonly repository: TranslationsRepository) {}

  /** Every override for one locale, as a flat map with English underneath. */
  async mapFor(locale: Locale): Promise<Record<string, string>> {
    const rows = await this.repository.findForLocale(locale);
    return buildTranslationMap(rows, locale);
  }

  /**
   * Resolves one key for a locale without a round trip per key — callers that
   * need many should use `mapFor` and read from the result.
   */
  localize(map: Record<string, string>, key: string, fallback: string): string {
    return localize(map, key, fallback);
  }

  // ----------------------------------------------------------------- admin

  /**
   * Every known key with its value in each locale, for the translation editor.
   *
   * `knownKeys` comes from the caller (the web app knows its own UI keys, the API
   * knows its entities), unioned with whatever is already stored, so a key is
   * never editable-but-invisible or stored-but-orphaned.
   */
  async listForEditor(knownKeys: Array<{ key: string; context?: string }> = []) {
    const rows = await this.repository.findAll();

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
      namespace: namespaceOf(key),
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
        await this.repository.delete(entry.key, entry.locale);
        continue;
      }
      await this.repository.upsert(entry.key, entry.locale, value);
    }
    return { updated: dto.translations.length };
  }
}
