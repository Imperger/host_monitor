import { readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { PingMonitor } from '../config';

interface HostState {
  isAlive?: boolean;
  checked?: number;
}

export class HostCheckpoint {
  private isAlive?: boolean;

  private checked?: number;

  private pendingStore = false;

  constructor(private id: string) {}

  async GetIsAlive(): Promise<boolean | undefined> {
    if (!this.isAlive) {
      await this.Load();
    }

    return this.isAlive;
  }

  async SetIsAlive(val: boolean): Promise<void> {
    this.isAlive = val;

    await this.SchedulaStore();
  }

  async GetChecked(): Promise<number | undefined> {
    if (!this.checked) {
      await this.Load();
    }

    return this.checked;
  }

  async SetChecked(val: number): Promise<void> {
    this.checked = val;

    await this.SchedulaStore();
  }

  private async Load(): Promise<void> {
    try {
      const state: HostState = JSON.parse((await readFile(this.Filename)).toString());
      this.isAlive = state.isAlive;
      this.checked = state.checked;
    } catch (e) {}
  }

  private async Store(): Promise<void> {
    const state: HostState = { isAlive: this.isAlive, checked: this.checked };
    await writeFile(this.Filename, JSON.stringify(state));

    this.pendingStore = false;
  }

  private async SchedulaStore() {
    if (!this.pendingStore) {
      this.pendingStore = true;

      return new Promise<void>((ok) => {
        process.nextTick(async () => {
          await this.Store();
          ok();
        });
      });
    }
  }

  private get Filename(): string {
    return `./data/${this.id}.json`;
  }

  public static CreateFromConfig(schema: PingMonitor) {
    const subj = schema.hostname.toLowerCase() + schema.ipVersion + schema.monitor;
    const id = createHash('md5').update(subj).digest('hex');

    return new HostCheckpoint(id);
  }
}
