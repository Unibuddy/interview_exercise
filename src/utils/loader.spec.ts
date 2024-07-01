import { Loader, IDataFetcher } from './loader';
import { ObjectID } from 'mongodb';

const created = new Date();

export class TestDto {
  id: ObjectID;
  text: string;
  description: string;
  created: Date;
}

const notFoundData = {
  text: 'Error displaying message',
  description: '',
  created,
};

describe('Loader', () => {
  let loader: Loader<TestDto>;
  const fetcher: IDataFetcher<TestDto> = {
    listByKeys: jest.fn().mockImplementation(() => {
      return Promise.resolve([
        {
          id: new ObjectID('607d9845b0a59bde6fa4a88e'),
          text: 'hello',
          description: '',
          created,
        },
      ]);
    }),
  };
  beforeEach(async () => {
    loader = new Loader(fetcher, notFoundData);
    jest.clearAllMocks();
  });
  describe('loadMany', () => {
    it('should call fetcher with the correct parameters', async () => {
      const result = await loader.loadMany([
        new ObjectID('607d9845b0a59bde6fa4a88e'),
      ]);
      expect(fetcher.listByKeys).toHaveBeenCalledWith([
        new ObjectID('607d9845b0a59bde6fa4a88e'),
      ]);
      expect(result).toStrictEqual([
        {
          id: new ObjectID('607d9845b0a59bde6fa4a88e'),
          text: 'hello',
          description: '',
          created,
        },
      ]);
    });
    it('should call fetcher only once', async () => {
      const results = await Promise.all([
        loader.loadMany([new ObjectID('607d9845b0a59bde6fa4a88e')]),
        loader.loadMany([new ObjectID('607d9845b0a59bde6fa4a88e')]),
      ]);
      expect(fetcher.listByKeys).toHaveBeenCalledWith([
        new ObjectID('607d9845b0a59bde6fa4a88e'),
      ]);
      expect(results).toStrictEqual([
        [
          {
            id: new ObjectID('607d9845b0a59bde6fa4a88e'),
            text: 'hello',
            description: '',
            created,
          },
        ],
        [
          {
            id: new ObjectID('607d9845b0a59bde6fa4a88e'),
            text: 'hello',
            description: '',
            created,
          },
        ],
      ]);
    });
    it('should return notFoundData if there is no data', async () => {
      const result = await loader.loadMany([
        new ObjectID('60a4f7c7cb1abb2267b08bb7'),
      ]);
      expect(fetcher.listByKeys).toHaveBeenCalledWith([
        new ObjectID('60a4f7c7cb1abb2267b08bb7'),
      ]);
      expect(result).toStrictEqual([
        {
          id: new ObjectID('60a4f7c7cb1abb2267b08bb7'),
          text: 'Error displaying message',
          description: '',
          created,
        },
      ]);
    });
  });
  describe('load', () => {
    it('should call fetcher with the correct parameters', async () => {
      const result = await loader.load(
        new ObjectID('607d9845b0a59bde6fa4a88e'),
      );
      expect(fetcher.listByKeys).toHaveBeenCalledWith([
        new ObjectID('607d9845b0a59bde6fa4a88e'),
      ]);
      expect(result).toStrictEqual({
        id: new ObjectID('607d9845b0a59bde6fa4a88e'),
        text: 'hello',
        description: '',
        created,
      });
    });
    it('should return notFoundData if there is no data', async () => {
      const result = await loader.load(
        new ObjectID('60a4f7c7cb1abb2267b08bb7'),
      );
      expect(result).toStrictEqual({
        id: new ObjectID('60a4f7c7cb1abb2267b08bb7'),
        text: 'Error displaying message',
        description: '',
        created,
      });
    });
  });
  describe('returnDefault', () => {
    it('should return the correct not found data', () => {
      const result = loader.returnDefault(
        new ObjectID('60a4f7c7cb1abb2267b08bb7'),
      );
      expect(result).toStrictEqual({
        id: new ObjectID('60a4f7c7cb1abb2267b08bb7'),
        text: 'Error displaying message',
        description: '',
        created,
      });
    });
  });
  describe('findByKey', () => {
    it('should return the correct document', () => {
      const data = [
        {
          id: new ObjectID('60a4f7c7cb1abb2267b08bb7'),
          text: 'hello',
          description: '',
          created,
        },
        {
          id: new ObjectID('60a4f7c7cb1abb2267b08bb8'),
          text: 'An event page with different id',
          description: '',
          created,
        },
      ];
      const result = loader.findByKey(
        data,
        new ObjectID('60a4f7c7cb1abb2267b08bb7'),
      );
      expect(result).toStrictEqual({
        id: new ObjectID('60a4f7c7cb1abb2267b08bb7'),
        text: 'hello',
        description: '',
        created,
      });
    });
  });
});
