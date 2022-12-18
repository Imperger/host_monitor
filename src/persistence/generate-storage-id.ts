import { createHash } from 'node:crypto';

interface ToString {
  toString(): string;
}

export function GenerateStorageId(...attrs: (ToString | undefined)[]): string {
  return createHash('md5')
    .update(attrs.map((x) => x?.toString() ?? 'undefined').join(''))
    .digest('hex');
}
