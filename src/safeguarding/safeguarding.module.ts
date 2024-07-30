import { Module } from '@nestjs/common';
import LanguageDetect from 'languagedetect';
import { LanguageDetectionService } from './language-detection.service';
import { SafeguardingService } from './safeguarding.service';

@Module({
  providers: [SafeguardingService, LanguageDetectionService, LanguageDetect],
  exports: [SafeguardingService],
})
export class SafeguardingModule {}
