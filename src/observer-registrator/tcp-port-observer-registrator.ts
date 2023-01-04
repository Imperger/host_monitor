import { Config, TcpPortMonitorConfig } from '../config';
import { TcpPortConnector } from '../connectors/tcp-port-connector';
import { MonitorRepository } from '../monitors/monitor-repository';
import { CreateTcpPortStorage } from '../monitors/tcp-port/tcp-port-file-storage';
import { TcpPortMonitor } from '../monitors/tcp-port/tcp-port-monitor';
import { TcpPortPresenceChangeObserver } from '../monitors/tcp-port/tcp-port-presence-change-observer';
import { CreatePersistent } from '../persistence/create-presistent';
import { SinkCollector } from '../sink-collector';
import { ObserverRegistrator } from './observer-registrator';

export class TcpPortObserverRegistrator implements ObserverRegistrator {
  public readonly Type = 'tcp-port';

  constructor(
    private readonly config: Config,
    private readonly sinks: SinkCollector,
    private readonly monitors: MonitorRepository
  ) {}

  async Register(c: TcpPortMonitorConfig): Promise<void> {
    const storage = CreateTcpPortStorage(c);
    const state = CreatePersistent(
      { isAlive: Boolean, checked: Number },
      { exclusive: true, storage }
    );

    const observer = new TcpPortConnector(
      c.hostname,
      c.port,
      c.ipVersion,
      c.timeout ?? 1000,
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
        .Get(TcpPortMonitor)
        .Register(new TcpPortPresenceChangeObserver(observer, await state.GetIsAlive()));
    } else {
      console.warn(
        `Skipping tcp-port observable 'ipv${c.ipVersion} ${c.hostname}:${c.port}' due to lack of any sink`
      );
    }
  }
}
