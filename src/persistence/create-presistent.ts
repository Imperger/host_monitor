import { isProxy } from 'util/types';
import { Storage } from './storage';

type BaseType<T> = T extends NumberConstructor
  ? number
  : T extends StringConstructor
  ? string
  : T extends BooleanConstructor
  ? boolean
  : never;

type RegularType<T> = BaseType<T> extends never
  ? { [p in keyof T]: RegularType<T[p]> }
  : BaseType<T>;

const GetterPrefix = 'Get';
const SetterPrefix = 'Set';

type RegularInterface<T> = { [p in keyof T]: RegularType<T[p]> };

type RegularProps<T> = {
  [p in { [K in keyof T]-?: BaseType<T[K]> extends never ? never : K }[keyof T]]: T[p];
};

type NestedProps<T> = Omit<T, keyof RegularProps<T>>;

type PersistentType<T> = BaseType<T> extends never
  ? { [p in keyof NestedProps<T>]: PersistentType<T[p]> } & ToFullAsyncAccessors<RegularProps<T>>
  : BaseType<T>;

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

const InternalKey: unique symbol = Symbol('internal');

export function CreatePersistentImpl<T extends Prop>(
  props: T,
  options: PersistentCreationOptions<RegularInterface<T>>,
  root?: RegularInterface<T>
): PersistentType<T> {
  return new Proxy(
    {
      [InternalKey]: { storeInProgress: false, pendingSetters: [] },
    } as unknown as RegularInterface<T> & PersistentType<T> & Internal,
    {
      get: (target, prop, receiver) => {
        const rootObj = root ?? receiver;

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
                      AssignInPlace(rootObj, x ?? {});

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
                      options.storage.Store(OmitAccessors(rootObj)).then((x) => {
                        internals.storeInProgress = false;

                        internals.pendingSetters.forEach((x) => x());
                        internals.pendingSetters = [];
                      });
                    });
                  }
                })) as typeof target[keyof AsyncSetters<T>];
            } else if (props[prop]) {
              (target as Prop)[prop] = CreatePersistentImpl(props[prop] as Prop, options, rootObj);
            }
          }

          return target[prop];
        } else if (prop === InternalKey) {
          return target[InternalKey];
        }
      },
    }
  ) as PersistentType<T>;
}

export function CreatePersistent<T extends Prop>(
  props: T,
  options: PersistentCreationOptions<RegularInterface<T>>
): PersistentType<T> {
  return CreatePersistentImpl(props, options);
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

interface PersistentLike {
  [id: string]: unknown;
  [id: symbol]: Internals;
  [id: `${typeof SetterPrefix}${Capitalize<string>}${string}`]: (x: unknown) => Promise<void>;
}


interface AnyObject {
  [id: string]: unknown;
}

function AssignInPlace<T>(target: PersistentLike, source: AnyObject) {
  target[InternalKey].storeInProgress = true;
  AssignInPlaceImpl(target, source);
  target[InternalKey].storeInProgress = false;
}

function AssignInPlaceImpl(target: PersistentLike, source: AnyObject) {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      AssignInPlace(target[key] as PersistentLike, source[key] as PersistentLike);
    } else {
      target[SetterMethodByPropName(key)](source[key]);
    }
  }
}

function SetterMethodByPropName(prop: string): `${typeof SetterPrefix}${Capitalize<string>}${string}` {
  return `${SetterPrefix}${prop[0].toUpperCase() as Capitalize<string>}${prop.slice(1)}`;
}

function OmitAccessors<T extends PersistentLike>(obj: T): T {
  const ret: T = {} as T;

  for (const key in obj) {
    if (!(key.startsWith(GetterPrefix) || key.startsWith(SetterPrefix))) {
      if (isProxy(obj[key])) {
        ret[key] = OmitAccessors(obj[key] as any);
      } else {
        ret[key] = obj[key];
      }
    }
  }

  return ret;
}
