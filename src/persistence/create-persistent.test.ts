import { beforeEach, describe, expect, test } from '@jest/globals';

import { Storage } from './storage';
import { CreatePersistent, ToFullAsyncAccessors } from './create-presistent';

interface Schema {
  a: number;
  b: string;
  c: boolean;
}

class PassiveStorage implements Storage<Schema> {
  async Store(state: Schema): Promise<void> {
    return;
  }
  async Load(): Promise<Schema | undefined> {
    return undefined;
  }
}

class MemStorageWithCounters implements Storage<Schema> {
  private storeCounter = 0;
  private loadCounter = 0;

  constructor(private obj?: Schema) {}

  async Store(state: Schema): Promise<void> {
    this.obj = state;
    ++this.storeCounter;
  }
  async Load(): Promise<Schema | undefined> {
    ++this.loadCounter;
    return this.obj;
  }

  get StoreCounter(): number {
    return this.storeCounter;
  }

  get LoadCounter(): number {
    return this.loadCounter;
  }
}

describe('With passive storage', () => {
  let obj: ToFullAsyncAccessors<Schema>;

  beforeEach(() => {
    obj = CreatePersistent(
      { a: Number, b: String, c: Boolean },
      { exclusive: true, storage: new PassiveStorage() }
    );
  });

  test('should act like a regular object', async () => {
    await obj.SetA(10);

    expect(await obj.GetA()).toEqual(10);
  });

  test('uninitialized properties should return undefined', async () => {
    expect(await obj.GetA()).toEqual(undefined);
  });

  test('after sequence of setter calls getter should return last assign', async () => {
    await obj.SetB('1');
    await obj.SetB('2');
    await obj.SetB('3');

    expect(await obj.GetB()).toEqual('3');
  });
});

describe('Load from storage', () => {
  test('should reflect stored in storage', async () => {
    const storage = new MemStorageWithCounters({ a: 10, b: '2', c: true });
    const obj = CreatePersistent(
      { a: Number, b: String, c: Boolean },
      { exclusive: true, storage }
    );

    expect(await obj.GetA()).toEqual(10);
  });
});

describe('With shared storage', () => {
  let storage: MemStorageWithCounters;
  let obj: ToFullAsyncAccessors<Schema>;

  beforeEach(() => {
    storage = new MemStorageWithCounters();

    obj = CreatePersistent({ a: Number, b: String, c: Boolean }, { exclusive: false, storage });
  });

  test('should save to storage each setter call', async () => {
    await obj.SetC(true);
    await obj.SetC(false);
    await obj.SetC(true);

    expect(storage.StoreCounter).toEqual(3);
  });

  test('should defer the actual save to the end of the synchronous task', async () => {
    obj.SetA(10);
    obj.SetB('20');
    await obj.SetC(true);

    const obj2 = (obj = CreatePersistent(
      { a: Number, b: String, c: Boolean },
      { exclusive: true, storage }
    ));

    expect({
      a: await obj2.GetA(),
      b: await obj2.GetB(),
      c: await obj2.GetC(),
      storeCount: storage.StoreCounter,
    }).toEqual({
      a: 10,
      b: '20',
      c: true,
      storeCount: 1,
    });
  });

  test('should load from storage for each getter call', async () => {
    await obj.SetA(10);
    const a0 = await obj.GetA();
    const a1 = await obj.GetA();
    const a3 = await obj.GetA();

    expect(storage.LoadCounter).toEqual(3);
  });

  test('should reflect value from storage', async () => {
    const shared = CreatePersistent(
      { a: Number, b: String, c: Boolean },
      { exclusive: false, storage }
    );

    await obj.SetB('1');
    await shared.SetB('2');

    expect(await obj.GetB()).toEqual('2');
  });
});

describe('With exclusive storage', () => {
  let storage: MemStorageWithCounters;
  let obj: ToFullAsyncAccessors<Schema>;

  beforeEach(() => {
    storage = new MemStorageWithCounters();

    obj = CreatePersistent({ a: Number, b: String, c: Boolean }, { exclusive: true, storage });
  });

  test('should store each time with await', async () => {
    await obj.SetA(1);
    await obj.SetA(2);
    await obj.SetA(3);

    expect(storage.StoreCounter).toEqual(3);
  });

  test('should store exactly one time with a sync use', async () => {
    obj.SetA(1);
    obj.SetA(2);
    obj.SetB('3');
    await obj.SetA(4);

    expect(storage.StoreCounter).toEqual(1);
  });

  test("shouldn't use load when access already initialized properties", async () => {
    obj.SetA(1);
    obj.SetB('2');

    await obj.GetA();
    await obj.GetB();

    expect(storage.LoadCounter).toEqual(0);
  });

  test('shouldn return undefined for uninitialized property', async () => {
    expect(await obj.GetA()).toEqual(undefined);
  });

  test('shouldn use load exactly once', async () => {
    await obj.GetA();

    expect(storage.LoadCounter).toEqual(1);
  });
});

describe('Some testcases', () => {
  let storage: MemStorageWithCounters;
  let obj: ToFullAsyncAccessors<Schema>;

  beforeEach(() => {
    storage = new MemStorageWithCounters();

    obj = CreatePersistent({ a: Number, b: String, c: Boolean }, { exclusive: true, storage });
  });

  test('Sequence of setters and getters', async () => {
    await obj.SetA(10);
    await obj.SetB('20');

    const a0 = await obj.GetA();
    const b0 = await obj.GetB();

    await obj.SetB('30');
    await obj.SetA(40);

    const a1 = await obj.GetA();
    const b1 = await obj.GetB();

    expect({ a0, b0, a1, b1 }).toEqual({ a0: 10, b0: '20', a1: 40, b1: '30' });
  });
});
