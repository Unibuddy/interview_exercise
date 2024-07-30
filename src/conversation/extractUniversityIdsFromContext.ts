import { ContextSchema, ContextType } from './models/ContextSchema.dto';

export function extractUniversityIdsFromContext({
  conversationContext,
}: {
  conversationContext: ContextSchema[];
}): string[] {
  return getUniversityContexts(conversationContext).map(({ id }) => id);
}

export function getUniversityContexts(conversationContext: ContextSchema[]) {
  return conversationContext.filter(
    (context: ContextSchema): context is { id: string; type: ContextType } =>
      context.type === ContextType.university && typeof context.id === 'string',
  );
}
