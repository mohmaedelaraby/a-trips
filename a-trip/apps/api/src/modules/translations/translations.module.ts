import { Module } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { AdminTranslationsController, LocalesController } from './translations.controller';

@Module({
  providers: [TranslationsService],
  controllers: [LocalesController, AdminTranslationsController],
  exports: [TranslationsService],
})
export class TranslationsModule {}
