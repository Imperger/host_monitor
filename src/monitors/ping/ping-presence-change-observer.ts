import { PingObserver } from './ping-observer';
import { IpVersionPreference, PingResult } from './ping-client';

export class PingPresenceChangeObserver implements PingObserver {
  constructor(private readonly observer: PingObserver, private prevPresence?: boolean) {}

  get Hostname(): string {
    return this.observer.Hostname;
  }

  get IpVersionPreference(): IpVersionPreference {
    return this.observer.IpVersionPreference;
  }

  get Interval(): number {
    return this.observer.Interval;
  }

  Notify(status: PingResult): void {
    if (this.prevPresence !== status.isAlive) {
      this.observer.Notify(status);

      this.prevPresence = status.isAlive;
    }
  }
}
