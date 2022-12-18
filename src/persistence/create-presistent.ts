import { Storage } from './storage';

type RegularType<T> = T extends NumberConstructor
  ? number
  : T extends StringConstructor
  ? string
  : T extends BooleanConstructor
  ? boolean
  : T;

const GetterPrefix = 'Get';
const SetterPrefix = 'Set';

type RegularInterface<T> = { [p in keyof T]: RegularType<T[p]> };

type AsyncGetters<T> = {
  [p in keyof T as `${typeof GetterPrefix}${Capitalize<string & p>}`]: () => Promise<
    RegularType<T[p] | undefined>
  >;
};

type AsyncSetters<T> = {
  [p in keyof T as `${typeof SetterPrefix}${Capitalize<string & p>}`]: (
    val: RegularType<T[p]>
  ) => Promise<void>;
};

export type ToFullAsyncAccessors<T> = AsyncGetters<T> & AsyncSetters<T>;

interface Prop {
  [id: string]: unknown;
}

interface PersistentCreationOptions<T> {
  exclusive: boolean;
  storage: Storage<T>;
}

interface Internals {
  storeInProgress: boolean;
  pendingSetters: (() => void)[];
}

interface Internal {
  [id: symbol]: Internals;
}

const InternalKey = Symbol('internal');

export function CreatePersistent<T extends Prop>(
  props: T,
  options: PersistentCreationOptions<RegularInterface<T>>
): ToFullAsyncAccessors<T> {
  return new Proxy(
    {
      [InternalKey]: { storeInProgress: false, pendingSetters: [] },
    } as unknown as RegularInterface<T> & ToFullAsyncAccessors<T> & Internal,
    {
      get: (target, prop, receiver) => {
        if (typeof prop === 'string') {
          if (!Object.prototype.hasOwnProperty.call(target, prop)) {
            if (IsGetterName(prop)) {
              target[prop as keyof AsyncGetters<T>] = (() =>
                new Promise<unknown>((resolve) => {
                  const srcProp = GetPropertyNameFromAccessor(props, prop);

                  if (options.exclusive && Object.prototype.hasOwnProperty.call(target, srcProp)) {
                    resolve(target[srcProp]);
                  } else {
                    options.storage.Load().then((x) => {
                      AssignInPlace(target, x ?? {});

                      resolve(target[srcProp]);
                    });
                  }
                })) as typeof target[keyof AsyncGetters<T>];
            } else if (IsSetterName(prop)) {
              target[prop as keyof AsyncSetters<T>] = ((val: unknown) =>
                new Promise<void>((resolve) => {
                  const internals = target[InternalKey];
                  internals.pendingSetters.push(resolve);

                  const srcProp = GetPropertyNameFromAccessor(props, prop);

                  (target as Prop)[srcProp] = val;

                  if (!internals.storeInProgress) {
                    internals.storeInProgress = true;

                    process.nextTick(() => {
                      options.storage.Store(OmitAccessors(target)).then((x) => {
                        internals.storeInProgress = false;

                        internals.pendingSetters.forEach((x) => x());
                        internals.pendingSetters = [];
                      });
                    });
                  }
                })) as typeof target[keyof AsyncSetters<T>];
            }
          }

          return target[prop];
        }
      },
    }
  ) as ToFullAsyncAccessors<T>;
}

type GetterName = `${typeof GetterPrefix}${string}`;
type SetterName = `${typeof SetterPrefix}${string}`;

function IsGetterName(str: string): str is GetterName {
  return str.startsWith(GetterPrefix);
}

function IsSetterName(str: string): str is SetterName {
  return str.startsWith(SetterPrefix);
}

function GetPropertyNameFromAccessor<T extends Prop>(
  props: T,
  accessorName: GetterName | SetterName
): string {
  const accessorStart = accessorName.startsWith(GetterPrefix)
    ? GetterPrefix.length
    : accessorName.startsWith(SetterPrefix)
    ? SetterPrefix.length
    : 0;

  const upperProp = accessorName.slice(accessorStart);
  const lowerProp = upperProp[0].toLowerCase() + upperProp.slice(1);

  if (Object.prototype.hasOwnProperty.call(props, upperProp)) {
    return upperProp;
  } else if (Object.prototype.hasOwnProperty.call(props, lowerProp)) {
    return lowerProp;
  }

  return '';
}

interface AnyObject {
  [id: string]: unknown;
}

function AssignInPlace(target: AnyObject, source: AnyObject) {
  for (const key in source) {
    target[key] = source[key];
  }
}

function OmitAccessors<T extends AnyObject>(obj: T): T {
  const ret: T = {} as T;

  for (const key in obj) {
    if (!(key.startsWith(GetterPrefix) || key.startsWith(SetterPrefix))) {
      ret[key] = obj[key];
    }
  }

  return ret;
}
