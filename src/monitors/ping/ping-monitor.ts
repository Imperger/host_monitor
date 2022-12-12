import { IpVersionPreference, PingClient, PingResult } from "./ping-client";
import { PingObserver } from "./ping-observer";

export class PingMonitor {
    private jobs = new Map<PingObserver, NodeJS.Timer>();

    constructor(private client: PingClient) { }

    public Register(observer: PingObserver): void {
        if (!this.jobs.has(observer)) {
            this.jobs.set(observer, this.SchedulePingJob(observer));
            this.PingJob(observer);
        }
    }

    public Unregister(observer: PingObserver): void {
        const job = this.jobs.get(observer);

        if (job) {
            clearInterval(job);
            this.jobs.delete(observer);
        }
    }

    private SchedulePingJob(o: PingObserver) {
        return setInterval(() => this.PingJob(o), o.Interval);
    }

    private async PingJob(o: PingObserver) {
        o.Notify(await this.client.Ping(o.Hostname, o.IpVersionPreference));
    }
}
