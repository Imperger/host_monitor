import { PingMonitorConfig } from '../../config';
import { FileStorage } from '../../persistence/file-storage';
import { GenerateStorageId } from '../../persistence/generate-storage-id';
import { HostState } from '../../persistence/host-state';

export function CreatePingFileStorage(schema: PingMonitorConfig) {
  return new FileStorage<HostState>(
    GenerateStorageId(schema.hostname.toLowerCase(), schema.ipVersion, schema.monitor)
  );
}
