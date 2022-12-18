import { ToFullAsyncAccessors } from '../persistence/create-presistent';
import { HostState } from '../persistence/host-state';
import { Connector } from './connector';
import { TcpPortObserver } from '../monitors/tcp-port/tcp-port-observer';
import { IpVersion } from '../monitors/tcp-port/ip-version';

interface FeedOptions {
  onAliveTemplate: string;
  onDeadTemplate: string;
  locale: string;
  timeZone: string;
}

export class TcpPortConnector extends Connector implements TcpPortObserver {
  constructor(
    public readonly Hostname: string,
    public readonly Port: number,
    public readonly IpVersion: IpVersion | undefined,
    public readonly ConnectionTimeout: number,
    public readonly Interval: number,
    options: FeedOptions,
    state: ToFullAsyncAccessors<HostState>
  ) {
    super(options, state);
  }

  async Notify(isOpen: boolean): Promise<void> {
    this.Flush(
      this.ReplaceKeywordsExt(isOpen ? this.options.onAliveTemplate : this.options.onDeadTemplate)
    );

    this.state.SetChecked(Date.now());
    this.state.SetIsAlive(isOpen);
  }

  private ReplaceKeywordsExt(str: string): string {
    const timeNow = new Date().toLocaleTimeString(this.options.locale, {
      timeZone: this.options.timeZone,
    });

    return str
      .replaceAll('$host', this.Hostname)
      .replaceAll('$port', this.Port.toString())
      .replaceAll('$ipv', this.IpVersion ?? '??');
  }
}
