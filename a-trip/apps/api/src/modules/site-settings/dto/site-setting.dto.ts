import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Locale } from '../../../generated/prisma/enums';

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

export class SiteContentQueryDto {
  /** Defaults to EN when absent or unrecognised. */
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
