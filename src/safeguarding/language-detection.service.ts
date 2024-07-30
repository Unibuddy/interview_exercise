import { Injectable } from '@nestjs/common';
import LanguageDetect from 'languagedetect';
import { Languages, DEFAULT_LANGUAGE } from '../enums/languages';

@Injectable()
export class LanguageDetectionService {
  constructor(private languageDetect: LanguageDetect) {}

  detectLanguage(message: string) {
    let language = DEFAULT_LANGUAGE;
    let key = language.toUpperCase();

    const result = this.languageDetect.detect(message, 1);
    if (result[0] && result[0][0]) {
      language = result[0][0];
      key = language.toUpperCase();
      if (!Object.keys(Languages).includes(key)) {
        return Languages.ENGLISH;
      }
    }

    return Languages[key as keyof typeof Languages];
  }
}
