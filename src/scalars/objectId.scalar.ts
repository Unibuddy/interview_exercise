import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { ObjectID } from 'mongodb';
import { GraphQLError } from 'graphql';

import { str } from '../utils/converters.utils';

// TODO: make this a package
const MONGODB_OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

@Scalar('ObjectId', () => ObjectID)
export class ObjectIDScalar implements CustomScalar<string, ObjectID> {
  description = 'ObjectId custom scalar type';

  serialize(value: ObjectID) {
    return str(value);
  }

  parseValue(value: string) {
    if (!MONGODB_OBJECTID_REGEX.test(value)) {
      throw new TypeError(
        `Value is not a valid mongodb object id of form: ${value}`,
      );
    }

    return new ObjectID(value);
  }

  parseLiteral(ast: ValueNode) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Can only validate strings as mongodb object id but got a: ${ast.kind}`,
      );
    }

    if (!MONGODB_OBJECTID_REGEX.test(ast.value)) {
      throw new TypeError(
        `Value is not a valid mongodb object id of form: ${ast.value}`,
      );
    }

    return new ObjectID(ast.value);
  }
}
