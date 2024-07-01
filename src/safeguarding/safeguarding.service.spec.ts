import { Test, TestingModule } from '@nestjs/testing';
import LanguageDetect from 'languagedetect';
import { LanguageDetectionService } from './language-detection.service';
import { SafeguardingService } from './safeguarding.service';

describe('SafeguardingService', () => {
  let service: SafeguardingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafeguardingService,
        LanguageDetectionService,
        LanguageDetect,
      ],
    }).compile();

    service = module.get<SafeguardingService>(SafeguardingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('clean', () => {
    it('should return 🤬 if the word is bad', () => {
      const message = 'cyberfuck hello test';
      expect(service.clean(message)).toEqual('🤬 hello test');
    });

    it('should be case insensitive', () => {
      const message = 'cYberFuck hello test';
      expect(service.clean(message)).toEqual('🤬 hello test');
    });

    it('should censor all bad words', () => {
      const message = 'cYberFuck hello test fuck';
      expect(service.clean(message)).toEqual('🤬 hello test 🤬');
    });

    it('should censor a bad word when it is plural', () => {
      const message = 'fucks hello test fuck';
      expect(service.clean(message)).toEqual('🤬 hello test 🤬');
    });
    it('should censor bad words followed by !', () => {
      const message = 'hey how are you fuck!?? shit!???';
      expect(service.clean(message)).toEqual('hey how are you 🤬!?? 🤬!???');
    });
    it('should not censor normal words', () => {
      const message = 'hey how are you';
      expect(service.clean(message)).toEqual('hey how are you');
    });
    it('should not censor bad words within words', () => {
      const message = 'hey how are you scunthorpe';
      expect(service.clean(message)).toEqual('hey how are you scunthorpe');
    });
    it('should whitelist bad words when context is in different language', () => {
      const message =
        'Når jeg snakker om fag, vil jeg vite hvilke fag som er tilgjengelige på dette god universitetet?';
      expect(service.clean(message)).toEqual(
        'Når jeg snakker om fag, vil jeg vite hvilke fag som er tilgjengelige på dette god universitetet?',
      );
    });
    it('should whitelist bad words when context is in different language, but should censor english bad words', () => {
      const message =
        'Fuck, Når jeg snakker om fag, vil jeg vite hvilke fag som er tilgjengelige på dette universitetet?';
      expect(service.clean(message)).toEqual(
        '🤬, Når jeg snakker om fag, vil jeg vite hvilke fag som er tilgjengelige på dette universitetet?',
      );
    });
    it('should clean empty text', () => {
      const message = '';
      expect(service.clean(message)).toEqual('');
    });
  });
});
