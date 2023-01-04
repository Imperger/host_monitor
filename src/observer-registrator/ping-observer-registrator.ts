import { Config, PingMonitorConfig } from '../config';
import { PingConnector } from '../connectors/ping-connetor';
import { MonitorRepository } from '../monitors/monitor-repository';
import { IpVersionPreference } from '../monitors/ping/ping-client';
import { CreatePingFileStorage } from '../monitors/ping/ping-file-storage';
import { PingMonitor } from '../monitors/ping/ping-monitor';
import { PingPresenceChangeObserver } from '../monitors/ping/ping-presence-change-observer';
import { CreatePersistent } from '../persistence/create-presistent';
import { SinkCollector } from '../sink-collector';
import { ObserverRegistrator } from './observer-registrator';

function IpVersionCast(ver?: '4' | '6') {
  switch (ver) {
    case '4':
      return IpVersionPreference.IpV4;
    case '6':
      return IpVersionPreference.IpV6;
    default:
      return IpVersionPreference.Any;
  }
}

export class PingObserverRegistrator implements ObserverRegistrator {
  public readonly Type = 'ping';

  constructor(
    private readonly config: Config,
    private readonly sinks: SinkCollector,
    private readonly monitors: MonitorRepository
  ) {}

  async Register(c: PingMonitorConfig): Promise<void> {
    const storage = CreatePingFileStorage(c);
    const state = CreatePersistent(
      { isAlive: Boolean, checked: Number },
      { exclusive: true, storage }
    );

    const observer = new PingConnector(
      c.hostname,
      IpVersionCast(c.ipVersion),
      c.interval * 1000,
      {
        onAliveTemplate: c.onAliveTemplate,
        onDeadTemplate: c.onDeadTemplate,
        timeZone: this.config.timeZone,
        locale: this.config.locale,
      },
      state
    );

    c.sink.forEach((s) => {
      const sink = this.sinks.Get(s);

      if (sink) {
        observer.AddSink(sink);
      }
    });

    if (observer.HasSink) {
      this.monitors
        .Get(PingMonitor)
        .Register(new PingPresenceChangeObserver(observer, await state.GetIsAlive()));
    } else {
      console.warn(`Skipping ping observable '${c.hostname}' due to lack of any sink`);
    }
  }
}
