import { describe, expect, test } from '@jest/globals';

import { ConsoleSink } from './console-sink';

describe('Flush', () => {
  test('should use stdout', () => {
    const origin = console.log;
    let stdoutuffer = '';
    console.log = (msg: string) => (stdoutuffer = msg);

    const sink = new ConsoleSink();
    const msg = '12345';
    sink.Flush(msg);

    console.log = origin;

    expect(stdoutuffer).toEqual(msg);
  });

  test('should always returns true', async () => {
    const sink = new ConsoleSink();

    expect(await sink.Flush('123')).toEqual(true);
  });
});
