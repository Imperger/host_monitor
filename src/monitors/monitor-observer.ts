export interface MonitorObserver<T> {
  Interval: number;
  Notify(status: T): void;
}
