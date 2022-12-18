import { TcpPortObserver } from './tcp-port-observer';
import { IpVersion } from './ip-version';

export class TcpPortPresenceChangeObserver implements TcpPortObserver {
  constructor(private readonly observer: TcpPortObserver, private prevPresence?: boolean) {}

  get Hostname(): string {
    return this.observer.Hostname;
  }

  get Port(): number {
    return this.observer.Port;
  }

  get IpVersion(): IpVersion | undefined {
    return this.observer.IpVersion;
  }

  get Interval(): number {
    return this.observer.Interval;
  }

  get ConnectionTimeout(): number {
    return this.observer.ConnectionTimeout;
  }

  Notify(isOpen: boolean): void {
    if (this.prevPresence !== isOpen) {
      this.observer.Notify(isOpen);

      this.prevPresence = isOpen;
    }
  }
}
