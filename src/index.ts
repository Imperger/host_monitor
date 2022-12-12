import { LoadConfig } from './config';
import { PingConnector } from './connectors/ping-connetor';
import { PingClientBase, IpVersionPreference } from './monitors/ping/ping-client';
import { PingMonitor } from './monitors/ping/ping-monitor';
import { PresenceChangeObserver } from './monitors/ping/presence-change-observer';
import { HostCheckpoint } from './persistence/host-checkpoint';
import { ConsoleSink } from './sinks/console-sink';
import { Sink } from './sinks/sink';
import { TgClient } from './sinks/tg/tg-client';
import { TgSink } from './sinks/tg/tg-sink';

function IpVersionCast(ver?: '4' | '6') {
    switch (ver) {
        case '4': return IpVersionPreference.IpV4;
        case '6': return IpVersionPreference.IpV6;
        default: return IpVersionPreference.Any;
    }
}

async function Main(): Promise<void> {
    const config = await LoadConfig('./data/config.json');

    const pingClient = new PingClientBase();
    const pingMonitor = new PingMonitor(pingClient);

    const tgClients = new Map<string, TgClient>();
    const sinks = new Map<string, Sink>([['console', new ConsoleSink()]])

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
            const state = HostCheckpoint.CreateFromConfig(w);

            const observer = new PingConnector(
                w.hostname,
                IpVersionCast(w.ipVersion),
                w.interval * 1000,
                { onAliveTemplate: w.onAliveTemplate, onDeadTemplate: w.onDeadTemplate, timeZone: config.timeZone, locale: config.locale },
                state);

            w.sink.forEach(s => observer.AddSink(sinks.get(s)!));

            pingMonitor.Register(new PresenceChangeObserver(observer, await state.GetIsAlive()));
        }
    });
}

Main();