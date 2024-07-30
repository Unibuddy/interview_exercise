import fetch from 'node-fetch';
import humps from 'humps';
import { Injectable } from '@nestjs/common';
import { User } from './models/user.model';
import { UserCacheManagerService } from '../cache-manager/user-cache-manager.service';
import { ConfigurationManager } from '../configuration/configuration-manager';

export interface IUserService {
  getUser(userId: string): Promise<User>;
  requestFunction(key: string): Promise<any>;
}

@Injectable()
export class UserService implements IUserService {
  private token: string;
  private baseUrl: string;

  constructor(
    private configurationManager: ConfigurationManager,
    private userCacheManagerService: UserCacheManagerService,
  ) {
    const userServiceConfig =
      this.configurationManager.getConfiguration().userService;

    this.token = userServiceConfig.token;
    this.baseUrl = userServiceConfig.url;
  }

  requestFunction = async (key: string): Promise<any> => {
    const requestUrl = `${this.baseUrl}/api/v1/users/${key}`;
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const parsedResponse = await response.json();
      return humps.camelizeKeys(parsedResponse);
    }

    throw new Error(
      `User Service request failed with error type: ${response.status} and message: ${response.statusText}`,
    );
  };

  async getUser(userId: string): Promise<User> {
    const response = await this.userCacheManagerService.getOrSet(
      userId,
      this.requestFunction,
    );
    if (!response) {
      throw new Error(
        'Could not find user in cache or get user from user service',
      );
    }
    return response;
  }
}
