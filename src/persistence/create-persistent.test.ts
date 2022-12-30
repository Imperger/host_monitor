import { beforeEach, describe, expect, test } from '@jest/globals';

import { Storage } from './storage';
import { CreatePersistent, ToFullAsyncAccessors } from './create-presistent';

async function NextTick() {
  return new Promise<void>((ok) => setImmediate(ok));
}

interface FlatScheme {
  a: number;
  b: string;
  c: boolean;
}

class PassiveStorage implements Storage<FlatScheme> {
  async Store(state: FlatScheme): Promise<void> {
    return;
  }
  async Load(): Promise<FlatScheme | undefined> {
    return undefined;
  }
}

class MemStorageWithCounters<T> implements Storage<T> {
  private storeCounter = 0;
  private loadCounter = 0;

  constructor(private obj?: T) {}

  async Store(state: T): Promise<void> {
    this.obj = state;
    ++this.storeCounter;
  }

  async Load(): Promise<T | undefined> {
    ++this.loadCounter;
    return this.obj;
  }

  get StoreCounter(): number {
    return this.storeCounter;
  }

  get LoadCounter(): number {
    return this.loadCounter;
  }

  get Value(): T | undefined {
    return this.obj;
  }
}

class MemStorageWitEmulatedStore<T> extends MemStorageWithCounters<T> {
  constructor(obj?: T) {
    super(obj);
  }

  async Store(state: T): Promise<void> {
    return new Promise<void>((ok) => {
      setImmediate(() => {
        super.Store(state).then(ok);
      });
    });
  }
}

describe('With passive storage', () => {
  let obj: ToFullAsyncAccessors<FlatScheme>;

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
  let storage: MemStorageWithCounters<FlatScheme>;
  let obj: ToFullAsyncAccessors<FlatScheme>;

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
  let storage: MemStorageWithCounters<FlatScheme>;
  let obj: ToFullAsyncAccessors<FlatScheme>;

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

interface OneLevelNestedSchema {
  a: string;
  b: { c: number };
}

describe('Nested props', () => {
  let storage: MemStorageWithCounters<OneLevelNestedSchema>;

  beforeEach(() => {
    storage = new MemStorageWithCounters();
  });

  test('one level nesting', async () => {
    const obj = CreatePersistent({ a: String, b: { c: Number } }, { exclusive: true, storage });

    await obj.b.SetC(10);

    expect(obj.b.GetC()).resolves.toEqual(10);
  });

  test('store one level', async () => {
    const obj = CreatePersistent({ a: String, b: { c: Number } }, { exclusive: true, storage });

    await obj.b.SetC(10);

    expect(storage.Value).toEqual({ b: { c: 10 } });
  });

  test('load state', async () => {
    const producer = CreatePersistent(
      { a: String, b: { c: Number } },
      { exclusive: false, storage }
    );
    await producer.b.SetC(10);

    const consumer = CreatePersistent(
      { a: String, b: { c: Number } },
      { exclusive: false, storage }
    );

    expect(consumer.b.GetC()).resolves.toEqual(10);
  });

  test("shouldn't use store while reconstruct state", async () => {
    const producer = CreatePersistent(
      { a: String, b: { c: Number } },
      { exclusive: false, storage }
    );
    await producer.b.SetC(10);

    const acceptableWrites = storage.StoreCounter;

    const consumer = CreatePersistent(
      { a: String, b: { c: Number } },
      { exclusive: false, storage }
    );

    await consumer.b.GetC();

    await NextTick();

    expect(storage.StoreCounter).toEqual(acceptableWrites);
  });
});

describe('store coherence', () => {
  let storage: MemStorageWitEmulatedStore<OneLevelNestedSchema>;

  beforeEach(() => {
    storage = new MemStorageWitEmulatedStore();
  });

  test('should be stored after setter fulfilled', async () => {
    const obj = CreatePersistent({ a: String, b: { c: Number } }, { exclusive: false, storage });

    await obj.b.SetC(10);

    expect(storage.StoreCounter).toBe(1);
  });
});

interface DeeplyNestedSchema {
  id: number;
  profile: {
    username: string;
    sex: boolean;
    contacts: {
      phone: string;
      messengers: {
        skype: string;
      };
    };
  };
}

describe('some testcases', () => {
  test('sequence of setters and getters', async () => {
    const storage = new MemStorageWithCounters<FlatScheme>();
    const obj = CreatePersistent(
      { a: Number, b: String, c: Boolean },
      { exclusive: true, storage }
    );
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

  test('sequence of nested setter and getters', async () => {
    const storage = new MemStorageWithCounters<DeeplyNestedSchema>();
    const schema = {
      id: Number,
      profile: {
        username: String,
        sex: Boolean,
        contacts: { phone: String, messengers: { skype: String } },
      },
    };
    const obj = CreatePersistent(schema, { exclusive: true, storage });

    const mock = {
      id: 10,
      profile: {
        username: 'Noname',
        sex: true,
        contacts: { phone: '12345', messengers: { skype: 'noname#123' } },
      },
    };

    await obj.SetId(mock.id);
    await obj.profile.SetUsername(mock.profile.username);
    await obj.profile.SetSex(mock.profile.sex);
    await obj.profile.contacts.SetPhone(mock.profile.contacts.phone);
    await obj.profile.contacts.messengers.SetSkype(mock.profile.contacts.messengers.skype);

    expect(obj.GetId()).resolves.toEqual(mock.id);
    expect(obj.profile.GetUsername()).resolves.toEqual(mock.profile.username);
    expect(obj.profile.GetSex()).resolves.toEqual(mock.profile.sex);
    expect(obj.profile.contacts.GetPhone()).resolves.toEqual(mock.profile.contacts.phone);
    expect(obj.profile.contacts.messengers.GetSkype()).resolves.toEqual(
      mock.profile.contacts.messengers.skype
    );
  });
});
