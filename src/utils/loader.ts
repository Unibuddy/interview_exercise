import { ObjectId, ObjectID } from 'mongodb';
import DataLoader from 'dataloader';

export interface IDataFetcher<E extends { id: ObjectID }> {
  listByKeys(ids: ObjectId[]): Promise<E[]>;
}

export interface ILoader<Dto extends { id: ObjectID }> {
  loadMany(ids: ObjectID[]): Promise<Dto[]>;
  load(id: ObjectID): Promise<Dto>;
}

export class Loader<Dto extends { id: ObjectID }> implements ILoader<Dto> {
  private dataLoader: DataLoader<ObjectID, Dto, string>;
  constructor(
    protected fetcher: IDataFetcher<Dto>,
    protected notFoundData?: Omit<Dto, 'id'>,
  ) {
    const batchLoadFn: DataLoader.BatchLoadFn<ObjectID, Dto> = async (
      ids: ReadonlyArray<ObjectID>,
    ) => {
      return this.batchIds(ids);
    };
    const options: DataLoader.Options<ObjectID, Dto, string> = {
      cacheKeyFn: (id: ObjectID) => id.toString(),
    };
    this.dataLoader = new DataLoader<ObjectID, Dto, string>(
      batchLoadFn,
      options,
    );
  }
  private async batchIds(ids: ReadonlyArray<ObjectID>): Promise<Dto[]> {
    const data = await this.fetcher.listByKeys([...ids]);
    const orderedData = ids.map((id) => {
      const result = this.findByKey(data, id);
      if (result === undefined) {
        return this.returnDefault(id);
      }
      return result;
    });
    return orderedData;
  }
  // In the instance that the key is not the id, this method can be overridden to update the key with the correct value
  returnDefault(id: ObjectId): Dto {
    return { ...this.notFoundData, id } as Dto;
  }
  // // In the instance that the key is not the id, this method can be overridden to point to a different key
  findByKey(data: Dto[], id: ObjectId) {
    return data.find((d: Dto) => d.id.toString() === id.toString());
  }
  async loadMany(ids: ObjectID[]): Promise<Dto[]> {
    const result = await this.dataLoader.loadMany(ids);
    if (result.some((e) => e instanceof Error)) {
      throw new Error(
        result
          .filter((e) => e instanceof Error)
          .map((e) => (e as Error).message)
          .join(','),
      );
    }
    return result as Dto[];
  }
  async load(id: ObjectID): Promise<Dto> {
    const result = await this.dataLoader.load(id);
    if (result instanceof Error) {
      throw new Error(result.message);
    }
    return result;
  }
}
