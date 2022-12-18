import { MonitorObserver } from '../monitor-observer';
import { IpVersionPreference, PingResult } from './ping-client';

export interface PingObserver extends MonitorObserver<PingResult> {
  Hostname: string;
  IpVersionPreference: IpVersionPreference;
  Interval: number;
  Notify(status: PingResult): void;
}
