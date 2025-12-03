import { injectable } from 'tsyringe';

import { UserEntity, UserRepository } from '../../repositories/user.repository';

@injectable()
export class UserService {
  constructor(private userRepo: UserRepository) {}

  async createUser(payload: Partial<UserEntity>): Promise<UserEntity> {
    return this.userRepo.create(payload);
  }

  async getUser(id: string): Promise<UserEntity | null> {
    return this.userRepo.findById(id);
  }

  async listUsers(): Promise<UserEntity[]> {
    return this.userRepo.findAll();
  }

  async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    return this.userRepo.update(id, updates);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepo.delete(id);
  }
}
