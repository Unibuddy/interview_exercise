import jwt from 'jsonwebtoken';
import { IUBJwt } from '../authentication/jwt.strategy';
import { getLocalConfig } from '../configuration/configuration-manager.utils';
import arg from 'arg';

/**
 * Arguments
 */
const args = arg({
  // Types
  '--userId': String,
  '--accountRole': String,
  '--universityId': String,
});

/**
 * Default arguments
 */
const userId = args['--userId'] || '599ebd736a1d100004aeb744';
const accountRole = args['--accountRole'] || 'university';
const universityId = args['--universityId'] || '599ccb2f0248050004a484e8';

/**
 * Signs and generates a JWT
 * @param userId The userId of the auth user
 * @param accountRole The accountRole of the auth user
 * @param universityId The universityId of the auth user
 * @returns {string} The signed JWT
 */
function generateToken(
  userId: string,
  accountRole: string,
  universityId: string,
): string {
  const payload: IUBJwt = {
    identity: {
      user_id: userId,
      account_role: accountRole,
      university_id: universityId,
    },
  };

  const token = jwt.sign(payload, getLocalConfig().auth.jwtSecret, {});

  return token;
}

/**
 * Main run
 */
const token = generateToken(userId, accountRole, universityId);
console.log('\n\nTOKEN ===', token);
