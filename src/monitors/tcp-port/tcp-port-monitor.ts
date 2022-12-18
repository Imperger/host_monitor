import { Monitor } from '../monitor';
import { PortChecker } from './port-checker';
import { TcpPortObserver } from './tcp-port-observer';

export class TcpPortMonitor extends Monitor<boolean> {
  constructor(private checker: PortChecker) {
    super();
  }

  async RunJob(o: TcpPortObserver): Promise<void> {
    o.Notify(
      await this.checker.Ping(o.Hostname, o.Port, {
        timeout: o.ConnectionTimeout,
        ipVersion: o.IpVersion,
      })
    );
  }
}
