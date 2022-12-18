import { readFile, writeFile } from 'fs/promises';

export class FileStorage<T> {
  constructor(protected readonly id: string) {}

  async Store(state: T): Promise<void> {
    await writeFile(this.Filename, JSON.stringify(state));
  }

  async Load(): Promise<T | undefined> {
    try {
      return JSON.parse((await readFile(this.Filename)).toString());
    } catch (e) {}
  }

  private get Filename(): string {
    return `./data/${this.id}.json`;
  }
}
