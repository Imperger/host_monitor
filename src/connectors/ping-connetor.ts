import ms from 'ms';
import { Sink } from '../sinks/sink';
import { PingObserver } from '../monitors/ping/ping-observer';
import { IpVersionPreference } from '../monitors/ping/ping-client';
import { PingResult } from '../monitors/ping/ping-client';
import { HostCheckpoint } from '../persistence/host-checkpoint';

interface FeedOptions {
  onAliveTemplate: string;
  onDeadTemplate: string;
  locale: string;
  timeZone: string;
}

export class PingConnector implements PingObserver {
  private sinks: Sink[] = [];

  constructor(
    public readonly Hostname: string,
    public readonly IpVersionPreference: IpVersionPreference,
    public readonly Interval: number,
    private readonly options: FeedOptions,
    private state: HostCheckpoint
  ) {}

  AddSink(sink: Sink): void {
    this.sinks.push(sink);
  }

  async Notify(status: PingResult): Promise<void> {
    const now = Date.now();
    const elapsed = now - ((await this.state.GetChecked()) ?? now);

    this.state.SetChecked(now);
    this.state.SetIsAlive(status.isAlive);

    this.sinks.forEach(async (s) =>
      s.Flush(
        await this.ReplaceKeywords(
          status.isAlive ? this.options.onAliveTemplate : this.options.onDeadTemplate,
          elapsed
        )
      )
    );
  }

  private ReplaceKeywords(str: string, elapsed: number): string {
    const timeNow = new Date().toLocaleTimeString(this.options.locale, {
      timeZone: this.options.timeZone,
    });

    return str
      .replaceAll('$now', timeNow)
      .replaceAll('$elapsed', ms(elapsed))
      .replaceAll('$host', this.Hostname);
  }
}
