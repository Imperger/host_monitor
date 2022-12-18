import { LoadConfig } from './config';
import { PingConnector } from './connectors/ping-connetor';
import { PingClientBase, IpVersionPreference } from './monitors/ping/ping-client';
import { PingMonitor } from './monitors/ping/ping-monitor';
import { PingPresenceChangeObserver } from './monitors/ping/ping-presence-change-observer';
import { CreatePersistent } from './persistence/create-presistent';
import { ConsoleSink } from './sinks/console-sink';
import { Sink } from './sinks/sink';
import { TgClient } from './sinks/tg/tg-client';
import { TgSink } from './sinks/tg/tg-sink';
import { CreatePingFileStorage } from './monitors/ping/ping-file-storage';
import { TcpPortMonitor } from './monitors/tcp-port/tcp-port-monitor';
import { PortChecker } from './monitors/tcp-port/port-checker';
import { CreateTcpPortStorage } from './monitors/tcp-port/tcp-port-file-storage';
import { TcpPortConnector } from './connectors/tcp-port-connector';
import { TcpPortPresenceChangeObserver } from './monitors/tcp-port/tcp-port-presence-change-observer';

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

async function Main(): Promise<void> {
  const config = await LoadConfig('./data/config.json');

  const pingClient = new PingClientBase();
  const pingMonitor = new PingMonitor(pingClient);

  const tcpPortChecker = new PortChecker();
  const tcpPortMonitor = new TcpPortMonitor(tcpPortChecker);

  const tgClients = new Map<string, TgClient>();
  const sinks = new Map<string, Sink>([['console', new ConsoleSink()]]);

  for (const id in config.sinks ?? {}) {
    const cfg = config.sinks![id];

    if (cfg.type === 'tg') {
      let tgClient = tgClients.get(cfg.credentials) ?? null;

      if (!tgClient) {
        tgClient = await TgClient.Create(config?.credentials?.[cfg.credentials]?.token ?? '');
      }

      if (tgClient) {
        sinks.set(id, new TgSink(tgClient, cfg.channelId));
      }
    }
  }

  config.watch.forEach(async (w) => {
    if (w.monitor === 'ping') {
      const storage = CreatePingFileStorage(w);
      const state = CreatePersistent(
        { isAlive: Boolean, checked: Number },
        { exclusive: true, storage }
      );

      const observer = new PingConnector(
        w.hostname,
        IpVersionCast(w.ipVersion),
        w.interval * 1000,
        {
          onAliveTemplate: w.onAliveTemplate,
          onDeadTemplate: w.onDeadTemplate,
          timeZone: config.timeZone,
          locale: config.locale,
        },
        state
      );

      w.sink.forEach((s) => observer.AddSink(sinks.get(s)!));

      pingMonitor.Register(new PingPresenceChangeObserver(observer, await state.GetIsAlive()));
    } else if (w.monitor === 'tcp-port') {
      const storage = CreateTcpPortStorage(w);
      const state = CreatePersistent(
        { isAlive: Boolean, checked: Number },
        { exclusive: true, storage }
      );

      const observer = new TcpPortConnector(
        w.hostname,
        w.port,
        w.ipVersion,
        w.timeout ?? 1000,
        w.interval * 1000,
        {
          onAliveTemplate: w.onAliveTemplate,
          onDeadTemplate: w.onDeadTemplate,
          timeZone: config.timeZone,
          locale: config.locale,
        },
        state
      );

      w.sink.forEach((s) => observer.AddSink(sinks.get(s)!));

      tcpPortMonitor.Register(
        new TcpPortPresenceChangeObserver(observer, await state.GetIsAlive())
      );
    }
  });
}

Main();
