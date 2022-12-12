export interface TgCredentials {
    type: 'tg',
    token: string;
}

export interface Credentials {
    [id: string]: TgCredentials;
}

export interface TgSink {
    type: 'tg',
    credentials: string;
    channelId: number;
}

export interface Sinks {
    [id: string]: TgSink;
}

export interface PingMonitor {
    monitor: 'ping';
    hostname: string;
    ipVersion?: '4' | '6';
    interval: number;
    onAliveTemplate: string;
    onDeadTemplate: string;
    sink: string[];
}

export interface Config {
    locale: string;
    timeZone: string;
    credentials?: Credentials;
    sinks?: Sinks;
    watch: PingMonitor[];
}
