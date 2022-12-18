import { TcpPortMonitorConfig } from '../../config';
import { FileStorage } from '../../persistence/file-storage';
import { GenerateStorageId } from '../../persistence/generate-storage-id';
import { HostState } from '../../persistence/host-state';

export function CreateTcpPortStorage(schema: TcpPortMonitorConfig) {
  return new FileStorage<HostState>(
    GenerateStorageId(schema.hostname.toLowerCase(), schema.port, schema.ipVersion, schema.monitor)
  );
}
