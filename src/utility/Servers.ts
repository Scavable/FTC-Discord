import Instance from '../types/Instance';

class Servers {
  /** In-memory cache of servers keyed by FriendlyName */
  public servers: Map<string, Instance> = new Map<string, Instance>();
  private lastUpdatedAt: number | null = null;

  public clear(): void {
    this.servers.clear();
    this.lastUpdatedAt = null;
  }

  public get(name: string): Instance | undefined {
    return this.servers.get(name);
  }

  public getMap(): Map<string, Instance> {
    return this.servers;
  }

  public getAll(): Instance[] {
    return Array.from(this.servers.values());
  }

  public upsert(instance: Instance): void {
    this.servers.set(instance.FriendlyName, instance);
    this.lastUpdatedAt = Date.now();
  }

  public setAll(instances: Instance[] | Map<string, Instance>): void {
    this.clear();
    if (instances instanceof Map) {
      instances.forEach((v, k) => this.servers.set(k, v));
    } else {
      for (const inst of instances) {
        this.servers.set(inst.FriendlyName, inst);
      }
    }
    this.lastUpdatedAt = Date.now();
  }

  /** Returns true if the cache was updated within the provided TTL (in ms) */
  public isFresh(ttlMs: number): boolean {
    if (!this.lastUpdatedAt) return false;
    return Date.now() - this.lastUpdatedAt <= ttlMs;
  }

  public getLastUpdated(): number | null {
    return this.lastUpdatedAt;
  }
}

export default Servers;