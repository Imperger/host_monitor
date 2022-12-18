import { Monitor } from '../monitor';
import { PingClient, PingResult } from './ping-client';
import { PingObserver } from './ping-observer';

export class PingMonitor extends Monitor<PingResult> {
  constructor(private client: PingClient) {
    super();
  }

  public async RunJob(o: PingObserver): Promise<void> {
    o.Notify(await this.client.Ping(o.Hostname, o.IpVersionPreference));
  }
}
