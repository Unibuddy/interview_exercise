import { Test, TestingModule } from '@nestjs/testing';
import { Message } from './message';

describe('Message', () => {
  let provider: Message;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Message],
    }).compile();

    provider = module.get<Message>(Message);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
