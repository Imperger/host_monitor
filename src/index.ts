import { LoadConfig } from './config';
import { PingClientBase } from './monitors/ping/ping-client';
import { PingMonitor } from './monitors/ping/ping-monitor';
import { TcpPortMonitor } from './monitors/tcp-port/tcp-port-monitor';
import { PortChecker } from './monitors/tcp-port/port-checker';
import { MonitorRepository } from './monitors/monitor-repository';
import { SinkCollector } from './sink-collector';
import {
  ObservableRegistratorRepository,
  PingObserverRegistrator,
  TcpPortObserverRegistrator,
} from './observer-registrator';

async function Main(): Promise<void> {
  const config = await LoadConfig('./data/config.json');

  const monitors = new MonitorRepository();

  monitors.Register(PingMonitor, () => new PingMonitor(new PingClientBase()));
  monitors.Register(TcpPortMonitor, () => new TcpPortMonitor(new PortChecker()));

  const sinks = new SinkCollector();
  await sinks.FromConfig(config);

  const registratorRepo = new ObservableRegistratorRepository();
  registratorRepo.Register(new PingObserverRegistrator(config, sinks, monitors));
  registratorRepo.Register(new TcpPortObserverRegistrator(config, sinks, monitors));

  config.watch.forEach(async (w) => registratorRepo.Use(w));
}

Main();
