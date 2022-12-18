export interface Storage<T> {
  Store(state: T): Promise<void>;
  Load(): Promise<T | undefined>;
}
