import { PingMonitorConfig, TcpPortMonitorConfig } from '../config';
import { ObserverRegistrator } from './observer-registrator';

export class ObservableRegistratorRepository {
  private readonly registrators = new Map<string, ObserverRegistrator>();

  Register(registrator: ObserverRegistrator): void {
    this.registrators.set(registrator.Type, registrator);
  }

  Use(config: PingMonitorConfig | TcpPortMonitorConfig) {
    const registrator = this.registrators.get(config.monitor);

    if (registrator) {
      registrator.Register(config);
    }
  }
}
