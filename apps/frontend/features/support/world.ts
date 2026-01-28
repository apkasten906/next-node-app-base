import { setWorldConstructor } from '@cucumber/cucumber';

class World {
  private data = new Map<string, unknown>();

  setData<T>(key: string, value: T): void {
    this.data.set(key, value as unknown);
  }

  getData<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }
}

setWorldConstructor(World);

export { World };
