import { exec } from 'child_process';
import { IpVersionPreference } from './ip-version-preference';
import { PingClient } from './ping-client';
import { PingResult } from './ping-result';


export class PingClientBase implements PingClient {
    private static readonly DeadHost = { isAlive: false, loss: 100, rttAvg: NaN };

    constructor(private requestCount = 3) { }

    public get RequestCount(): number {
        return this.requestCount;
    }

    public set RequestCount(count: number) {
        this.requestCount = count;
    }

    public async Ping(hostname: string, ipVersion: IpVersionPreference): Promise<PingResult> {
        return new Promise<PingResult>((resolve) => {
            exec(this.BuildCmd(hostname, ipVersion), (err, stdout, stderr) => {
                if (err) {
                    resolve(PingClientBase.DeadHost);
                } else {
                    resolve(this.ParseStdout(stdout));
                }
            });
        });
    }

    private BuildCmd(hostname: string, ipVersion: IpVersionPreference): string {
        return `ping ${hostname} ${ipVersion} -c ${this.requestCount}`;
    }

    private ParseStdout(stdout: string): PingResult {
        const stdoutLines = stdout.split('\n');

        if (stdoutLines.length < 3) {
            return PingClientBase.DeadHost;
        }

        const loss = this.ExtractLossPercentage(stdoutLines[stdoutLines.length - 3]);
        const rttAvg = this.ExtractrttAvg(stdoutLines[stdoutLines.length - 2]);

        return { isAlive: loss < 100, loss, rttAvg };
    }

    private ExtractLossPercentage(str: string): number {
        return Number.parseInt(str.match(/ (\d{1,3})% packet loss/)?.[1] ?? '');
    }

    private ExtractrttAvg(str: string): number {
        return Number.parseFloat(str.match(/= \d+\.\d+\/(\d+\.\d+)\//)?.[1] ?? '');
    }
}
