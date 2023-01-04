import { Config } from './config';
import { ConsoleSink } from './sinks/console-sink';
import { Sink } from './sinks/sink';
import { TgClient } from './sinks/tg/tg-client';
import { TgSink } from './sinks/tg/tg-sink';

export class SinkCollector {
  private tgPool = new Map<string, TgClient>();

  private sinks = new Map<string, Sink>([['console', new ConsoleSink()]]);

  async FromConfig(config: Config): Promise<void> {
    for (const id in config.sinks ?? {}) {
      const cfg = config.sinks![id];

      if (cfg.type === 'tg') {
        let tgClient = this.tgPool.get(cfg.credentials) ?? null;

        if (!tgClient) {
          tgClient = await TgClient.Create(config?.credentials?.[cfg.credentials]?.token ?? '');
        }

        if (tgClient) {
          this.sinks.set(id, new TgSink(tgClient, cfg.channelId));
        }
      }
    }
  }

  Get(id: string): Sink | null {
    return this.sinks.get(id) ?? null;
  }
}
