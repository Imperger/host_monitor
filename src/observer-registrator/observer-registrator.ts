import { PingMonitorConfig, TcpPortMonitorConfig } from '../config';

export interface ObserverRegistrator {
  readonly Type: string;

  Register(config: PingMonitorConfig | TcpPortMonitorConfig): Promise<void>;
}
