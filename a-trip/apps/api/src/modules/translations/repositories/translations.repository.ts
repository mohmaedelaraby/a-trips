import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Locale } from '../../../generated/prisma/enums';
import { FALLBACK_LOCALE } from '../utils/locale.util';

export interface TranslationRow {
  key: string;
  locale: Locale;
  value: string;
}

@Injectable()
export class TranslationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rows for one locale plus the fallback, in a single query.
   *
   * Fetching both together rather than two round trips matters because this runs
   * on the first render of every page.
   */
  findForLocale(locale: Locale): Promise<TranslationRow[]> {
    return this.prisma.translation.findMany({
      where:
        locale === FALLBACK_LOCALE ? { locale } : { locale: { in: [FALLBACK_LOCALE, locale] } },
      select: { key: true, locale: true, value: true },
    });
  }

  findAll() {
    return this.prisma.translation.findMany({ orderBy: [{ key: 'asc' }] });
  }

  upsert(key: string, locale: Locale, value: string) {
    return this.prisma.translation.upsert({
      where: { key_locale: { key, locale } },
      create: { key, locale, value },
      update: { value },
    });
  }

  delete(key: string, locale: Locale) {
    return this.prisma.translation.deleteMany({ where: { key, locale } });
  }
}
