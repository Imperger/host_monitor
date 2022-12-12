export interface Sink {
    Flush(msg: string): Promise<boolean>;
}
