import { Injectable } from '@nestjs/common';
import badWords from 'badwords-list';
import { hashCode } from '../utils/string.utils';
import { LanguageDetectionService } from './language-detection.service';
import { whiteListedSet } from './whitelisted-words';

@Injectable()
export class SafeguardingService {
  constructor(private languageDetect: LanguageDetectionService) {}
  clean(message: string) {
    const whitelistSet =
      whiteListedSet[this.languageDetect.detectLanguage(message)];
    const hashMap = new Map();
    // replace whitelisted words into hash
    if (whitelistSet) {
      message = message.replace(whitelistSet, (substring) => {
        const hash = String(hashCode(substring));
        hashMap.set(hash, substring);
        return hash;
      });
    }
    message = message.replace(badWords.regex, '🤬'); // censor english offensive words
    // replace the hash to whitelist words
    if (whitelistSet) {
      return message.replace(/([0-9]+)/g, (substring) => {
        const hash = hashMap.get(substring);
        return hash ? hash : substring;
      });
    }
    return message;
  }
}
