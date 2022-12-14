import { Sink } from '../sink';
import { TgClient } from './tg-client';

export class TgSink implements Sink {
  constructor(private readonly client: TgClient, private readonly channelId: number) {}

  async Flush(msg: string): Promise<boolean> {
    try {
      await this.client.SendMessage(this.channelId, msg);
      return true;
    } catch (e) {
      return false;
    }
  }
}
