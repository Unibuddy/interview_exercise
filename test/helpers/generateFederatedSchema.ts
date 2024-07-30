import fs from 'fs';

import { parse } from 'graphql';
import { normalizeTypeDefs } from '@apollo/federation';
import { request } from 'graphql-request';
import { printWithComments } from '@graphql-tools/utils';

const APP_URL: string = process.env.APP_URL as string;

const sdlQuery = `
  query {
    _service {
      sdl
    }
  }
`;

export async function generateFederatedSchema(
  applicationUrl: string,
): Promise<string> {
  const sdlResult = await request(`${applicationUrl}/graphql`, sdlQuery);

  const typeDefs = parse(sdlResult._service.sdl);

  const federatedSchema = `# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------
${printWithComments(normalizeTypeDefs(typeDefs))}`;

  return federatedSchema;
}

generateFederatedSchema(APP_URL).then((schema) => {
  fs.writeFileSync('./federated-schema.gql', schema);
});
