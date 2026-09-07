import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, Length, ValidateNested } from 'class-validator';

export class SiteSettingEntryDto {
  @IsString()
  @Length(1, 120)
  key: string;

  /** Empty is allowed: it is how a social link or optional line is cleared. */
  @IsString()
  @Length(0, 2000)
  value: string;
}

export class UpdateSiteSettingsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SiteSettingEntryDto)
  settings: SiteSettingEntryDto[];
}
