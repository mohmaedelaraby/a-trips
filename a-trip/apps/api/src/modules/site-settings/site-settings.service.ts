import { Injectable, NotFoundException } from '@nestjs/common';
import { SiteSettingsRepository } from './repositories/site-settings.repository';
import {
  SITE_SETTING_PRESETS_BY_KEY,
  buildSettingsList,
  mergeSettingsMap,
} from './utils/site-setting.util';
import type { UpdateSiteSettingsDto } from './dto/site-setting.dto';

export { SITE_SETTING_DEFAULTS } from './utils/site-setting.util';

@Injectable()
export class SiteSettingsService {
  constructor(private readonly repository: SiteSettingsRepository) {}

  /** Flat key/value map for the site to read, defaults merged underneath. */
  async publicMap(): Promise<Record<string, string>> {
    return mergeSettingsMap(await this.repository.findKeyValues());
  }

  /** Admin list: every known setting, stored value or shipped default. */
  async list() {
    return buildSettingsList(await this.repository.findAll());
  }

  /** Saves many settings at once — the admin form submits a whole group. */
  async update(dto: UpdateSiteSettingsDto) {
    for (const entry of dto.settings) {
      const preset = SITE_SETTING_PRESETS_BY_KEY.get(entry.key);
      if (!preset) {
        // Unknown and unstored means a typo or a stale form, not a new setting:
        // accepting it would write a row no screen can ever show or clear.
        const exists = await this.repository.findByKey(entry.key);
        if (!exists) throw new NotFoundException(`Unknown setting "${entry.key}"`);
      }
      await this.repository.upsert({
        key: entry.key,
        value: entry.value,
        group: preset?.group ?? 'general',
        label: preset?.label ?? entry.key,
      });
    }

    return this.list();
  }

  /** Drops the stored override so the shipped default applies again. */
  async reset(key: string) {
    await this.repository.delete(key);
    return this.list();
  }
}
