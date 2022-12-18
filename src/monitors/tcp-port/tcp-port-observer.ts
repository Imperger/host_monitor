import { MonitorObserver } from '../monitor-observer';
import { IpVersion } from './ip-version';

export interface TcpPortObserver extends MonitorObserver<boolean> {
  Hostname: string;
  Port: number;
  IpVersion?: IpVersion;
  ConnectionTimeout: number;
  Interval: number;
  Notify(isOpen: boolean): void;
}
