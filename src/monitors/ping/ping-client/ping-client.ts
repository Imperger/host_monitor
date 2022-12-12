import { PingResult } from "./ping-result";
import { IpVersionPreference } from "./ip-version-preference";

export interface PingClient {
    Ping(hostname: string, ipVersion: IpVersionPreference): Promise<PingResult>;
}
