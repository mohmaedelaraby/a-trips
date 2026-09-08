import { Module } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { AdminTranslationsController, LocalesController } from './translations.controller';
import { TranslationsRepository } from './repositories/translations.repository';

@Module({
  providers: [TranslationsService, TranslationsRepository],
  controllers: [LocalesController, AdminTranslationsController],
  exports: [TranslationsService, TranslationsRepository],
})
export class TranslationsModule {}
