import { Request, Response } from 'express';
import { autoInjectable } from 'tsyringe';

import { UserService } from '../services/user/user.service';

@autoInjectable()
export class UserController {
  constructor(private userService?: UserService) {}

  async create(req: Request, res: Response): Promise<void> {
    const user = await this.userService!.createUser(req.body);
    res.status(201).json(user);
  }

  async get(req: Request, res: Response): Promise<void> {
    const id = String(req.params['id']);
    const user = await this.userService!.getUser(id);
    if (!user) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    res.json(user);
    return;
  }

  async list(_req: Request, res: Response): Promise<void> {
    const users = await this.userService!.listUsers();
    res.json({ items: users, meta: { total: users.length } });
    return;
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = String(req.params['id']);
    const updated = await this.userService!.updateUser(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    res.json(updated);
    return;
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = String(req.params['id']);
    await this.userService!.deleteUser(id);
    res.status(204).send();
    return;
  }
}
