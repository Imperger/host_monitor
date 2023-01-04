import ms from 'ms';
import { ToFullAsyncAccessors } from '../persistence/create-presistent';
import { HostState } from '../persistence/host-state';
import { Sink } from '../sinks/sink';

interface FeedOptions {
  onAliveTemplate: string;
  onDeadTemplate: string;
  locale: string;
  timeZone: string;
}

export class Connector {
  private sinks: Sink[] = [];

  constructor(
    protected readonly options: FeedOptions,
    protected state: ToFullAsyncAccessors<HostState>
  ) {}

  AddSink(sink: Sink): void {
    this.sinks.push(sink);
  }

  get HasSink(): boolean {
    return this.sinks.length > 0;
  }

  async Flush(msg: string): Promise<void> {
    const now = Date.now();
    const elapsed = now - ((await this.state.GetChecked()) ?? now);

    this.sinks.forEach(async (s) => s.Flush(await this.ReplaceKeywords(msg, elapsed)));
  }

  private ReplaceKeywords(str: string, elapsed: number): string {
    const timeNow = new Date().toLocaleTimeString(this.options.locale, {
      timeZone: this.options.timeZone,
    });

    return str.replaceAll('$now', timeNow).replaceAll('$elapsed', ms(elapsed));
  }
}
