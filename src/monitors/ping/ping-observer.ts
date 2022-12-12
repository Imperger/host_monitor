import { IpVersionPreference, PingResult } from "./ping-client";

export interface PingObserver {
    Hostname: string;
    IpVersionPreference: IpVersionPreference;
    Interval: number;
    Notify(status: PingResult): void;
}
