import { Sink } from './sink';

export class ConsoleSink implements Sink {
  async Flush(msg: string): Promise<boolean> {
    console.log(msg);

    return true;
  }
}
