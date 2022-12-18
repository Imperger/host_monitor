import { MonitorObserver } from './monitor-observer';

export abstract class Monitor<TNotifyPayload> {
  private jobs = new Map<MonitorObserver<TNotifyPayload>, NodeJS.Timer>();

  public Register(observer: MonitorObserver<TNotifyPayload>): void {
    if (!this.jobs.has(observer)) {
      this.jobs.set(observer, this.ScheduleJob(observer));
      this.RunJob(observer);
    }
  }

  public Unregister(observer: MonitorObserver<TNotifyPayload>): void {
    const job = this.jobs.get(observer);

    if (job) {
      clearInterval(job);
      this.jobs.delete(observer);
    }
  }

  private ScheduleJob(o: MonitorObserver<TNotifyPayload>) {
    return setInterval(() => this.RunJob(o), o.Interval);
  }

  abstract RunJob(o: MonitorObserver<TNotifyPayload>): Promise<void>;
}
