import { Languages } from '../../enums/languages';
import { norwegianRegex } from './nor';

const whiteListedSet: { [key in Languages]: RegExp | null } = {
  nor: norwegianRegex,
  eng: null,
};

export { whiteListedSet };
