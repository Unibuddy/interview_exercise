import { ObjectID } from 'mongodb';

export const str = (value: ObjectID | null | undefined) => {
  if (value instanceof ObjectID) {
    return value.toHexString();
  }
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return `${value}`;
};
