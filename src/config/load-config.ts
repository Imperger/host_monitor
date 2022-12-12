import { readFile } from 'fs/promises';
import { Config } from './config';

export async function LoadConfig(filename: string): Promise<Config> {
    return JSON.parse((await readFile(filename)).toString());
}
