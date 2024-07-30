import { ObjectId } from 'bson';
import { GraphQLError, Kind } from 'graphql';
import { ObjectIDScalar } from './objectId.scalar';
const scalar = new ObjectIDScalar();
const oid = new ObjectId('603e70ea1c10d0673e99dfb3');
const oidString = '603e70ea1c10d0673e99dfb3';

describe('serialize', () => {
  it('serialises oid in a string', () => {
    expect(scalar.serialize(oid)).toBe(oidString);
  });
});

describe('parseValue', () => {
  it('returns an object id if value matches regex', () => {
    expect(scalar.parseValue(oidString)).toEqual(oid);
  });
  it('throws type error if value is not an oid', () => {
    expect(() => scalar.parseValue('1')).toThrow(
      TypeError(`Value is not a valid mongodb object id of form: 1`),
    );
  });
});

describe('parseLiteral', () => {
  it('throws an graphql error if kind is not a string', () => {
    expect(() =>
      scalar.parseLiteral({ kind: 'IntValue', value: '1' }),
    ).toThrowError(
      new GraphQLError(
        `Can only validate strings as mongodb object id but got a: IntValue`,
      ),
    );
  });
  it('throws an type error if kind is not a valid string', () => {
    expect(() =>
      scalar.parseLiteral({ kind: Kind.STRING, value: '1' }),
    ).toThrowError(
      new TypeError(`Value is not a valid mongodb object id of form: 1`),
    );
  });
  it('resolve to an object id if all good', () => {
    expect(
      scalar.parseLiteral({ kind: Kind.STRING, value: oidString }),
    ).toEqual(oid);
  });
});
