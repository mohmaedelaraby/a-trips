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

export class TranslationEntryDto {
  @IsString()
  @Length(1, 200)
  key: string;

  @IsEnum(Locale)
  locale: Locale;

  /** Empty clears the override, restoring the shipped default. */
  @IsString()
  @Length(0, 5000)
  value: string;
}

export class UpdateTranslationsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TranslationEntryDto)
  translations: TranslationEntryDto[];
}

export class KnownKeyDto {
  @IsString()
  @Length(1, 200)
  key: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  context?: string;
}

export class ListTranslationsDto {
  /**
   * Keys the web app knows about from its JSON files. Sent by the admin screen
   * so strings that have never been overridden are still editable.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => KnownKeyDto)
  knownKeys?: KnownKeyDto[];
}
