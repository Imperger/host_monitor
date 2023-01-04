interface Constructor {
  new (...args: any[]): unknown;
}

export class MonitorRepository {
  private monitors = new Map<unknown, { instance: unknown; factory: () => unknown }>();

  Register<TMonitor extends Constructor>(
    type: TMonitor,
    factory: () => InstanceType<TMonitor>
  ): void {
    this.monitors.set(type, { instance: null, factory });
  }

  Get<TMonitor extends Constructor>(type: TMonitor): InstanceType<TMonitor> {
    const monitorDescriptor = this.monitors.get(type);

    if (!monitorDescriptor) {
      throw new Error('Unknown monitor type');
    }

    if (monitorDescriptor.instance) {
      return monitorDescriptor.instance as InstanceType<TMonitor>;
    }

    const instance = monitorDescriptor.factory();

    this.monitors.set(type, { instance, factory: monitorDescriptor.factory });

    return instance as InstanceType<TMonitor>;
  }
}
