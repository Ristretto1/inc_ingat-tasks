import { ObjectId } from 'mongodb';
import { userCollection } from '../db/db';
import { IOutputModel } from '../models/common.types';
import { usersMapper } from '../models/users/mapper/usersMapper';
import { IUserOutput } from '../models/users/output.types';
import { IQueryUserData } from '../models/users/query.types';
import { IUserDB } from '../models/db/db.types';

export class UserRepository {
  static async getAll(data: IQueryUserData): Promise<IOutputModel<IUserOutput>> {
    let { pageNumber, pageSize, searchEmailTerm, searchLoginTerm, sortBy, sortDirection } = data;
    pageNumber = Number(pageNumber);
    pageSize = Number(pageSize);

    let filter = {};
    const emailFilter = { email: { $regex: searchEmailTerm, $options: 'i' } };
    const loginFilter = { email: { $regex: searchLoginTerm, $options: 'i' } };
    if (searchLoginTerm && searchEmailTerm) {
      filter = { $or: [emailFilter, loginFilter] };
    } else if (searchEmailTerm) {
      filter = emailFilter;
    } else if (searchLoginTerm) {
      filter = loginFilter;
    }

    const users = await userCollection
      .find(filter)
      .sort(sortBy, sortDirection)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const totalCount = await userCollection.countDocuments(filter);
    const pagesCount = Math.ceil(totalCount / pageSize);

    return {
      items: users.map(usersMapper),
      page: pageNumber,
      pagesCount,
      pageSize,
      totalCount,
    };
  }
  static async removeUser(id: string): Promise<boolean> {
    const res = await userCollection.deleteOne({ _id: new ObjectId(id) });
    return !!res.deletedCount;
  }

  static async createUser(data: IUserDB): Promise<IUserOutput | null> {
    const res = await userCollection.insertOne(data);
    const index = res.insertedId;
    const user = await userCollection.findOne({ _id: index });
    if (user) return usersMapper(user);
    else return null;
  }
}