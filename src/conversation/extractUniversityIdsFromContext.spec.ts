import { extractUniversityIdsFromContext } from './extractUniversityIdsFromContext';
import { ContextSchema, ContextType } from './models/ContextSchema.dto';

describe('extractUniversityIdsFromContext', () => {
  it('returns the expected ids', () => {
    const conversationContext: ContextSchema[] = [
      {
        id: '1',
        type: ContextType.university,
      },
      {
        id: '2',
        type: ContextType.university,
      },
    ];

    const extractedIds = extractUniversityIdsFromContext({
      conversationContext,
    });

    expect(extractedIds).toEqual(['1', '2']);
  });
});
