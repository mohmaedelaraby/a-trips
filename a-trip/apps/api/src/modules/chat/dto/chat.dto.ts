import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Locale } from '../../../generated/prisma/enums';

/** One turn of the conversation as the browser has it. */
export class ChatTurnDto {
  /** Only the two roles a transcript can contain — a client-supplied `system` turn would be a prompt injection with extra steps. */
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @Length(1, 2000)
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @Length(1, 2000)
  message: string;

  /**
   * Prior turns, oldest first. Capped here as well as in the service: the
   * whole transcript is re-sent on every message, and an unbounded one is
   * somebody else's token bill.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  /** Answers follow the site's current language. */
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
