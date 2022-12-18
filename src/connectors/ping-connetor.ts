import { PingObserver } from '../monitors/ping/ping-observer';
import { IpVersionPreference } from '../monitors/ping/ping-client';
import { PingResult } from '../monitors/ping/ping-client';
import { ToFullAsyncAccessors } from '../persistence/create-presistent';
import { HostState } from '../persistence/host-state';
import { Connector } from './connector';

interface FeedOptions {
  onAliveTemplate: string;
  onDeadTemplate: string;
  locale: string;
  timeZone: string;
}

export class PingConnector extends Connector implements PingObserver {
  constructor(
    public readonly Hostname: string,
    public readonly IpVersionPreference: IpVersionPreference,
    public readonly Interval: number,
    options: FeedOptions,
    state: ToFullAsyncAccessors<HostState>
  ) {
    super(options, state);
  }

  async Notify(status: PingResult): Promise<void> {
    this.Flush(
      this.ReplaceKeywordsExt(
        status.isAlive ? this.options.onAliveTemplate : this.options.onDeadTemplate
      )
    );

    this.state.SetChecked(Date.now());
    this.state.SetIsAlive(status.isAlive);
  }

  private ReplaceKeywordsExt(str: string): string {
    return str.replaceAll('$host', this.Hostname);
  }
}
