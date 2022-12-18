import { Socket, isIP } from 'node:net';
import { resolve } from 'node:dns/promises';
import { IpVersion } from './ip-version';

type DnsRecordType = 'A' | 'AAAA';

interface PortCheckOptions {
  timeout: number;
  ipVersion?: IpVersion;
}

export class PortChecker {
  public async Ping(hostname: string, port: number, options: PortCheckOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const socket = new Socket();

      const portUnreachable = () => {
        socket.destroy();
        resolve(false);
      };

      socket.setTimeout(options.timeout);
      socket.once('error', portUnreachable);
      socket.once('timeout', portUnreachable);
      socket.once('connected', () => socket.end());
      const g = options.ipVersion && !isIP(hostname);
      Promise.resolve(
        options.ipVersion && !isIP(hostname)
          ? this.ResolveIp(hostname, options.ipVersion)
          : hostname
      )
        .then((x) => {
          socket.connect(port, x, () => resolve(true));
        })
        .catch((e) => resolve(false));
    });
  }

  private async ResolveIp(hostname: string, version: IpVersion): Promise<string> {
    return ((await resolve(hostname, this.IpVersionToRecordType(version))) as string[])[0];
  }

  private IpVersionToRecordType(ver: IpVersion): DnsRecordType {
    switch (ver) {
      case '4':
        return 'A';
      case '6':
        return 'AAAA';
    }
  }
}
