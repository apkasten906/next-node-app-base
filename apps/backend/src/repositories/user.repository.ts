import { injectable } from 'tsyringe';

export interface UserEntity {
  id: string;
  email: string;
  role?: string;
  createdAt?: Date;
}

@injectable()
export class UserRepository {
  private store = new Map<string, UserEntity>();

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const id = Date.now().toString();
    const entity: UserEntity = {
      id,
      email: user.email || 'unknown@example.com',
      role: user.role || 'USER',
      createdAt: new Date(),
    };

    this.store.set(id, entity);
    return entity;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.store.get(id) || null;
  }

  async findAll(): Promise<UserEntity[]> {
    return Array.from(this.store.values());
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date() } as UserEntity;
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
