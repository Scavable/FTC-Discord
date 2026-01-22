import Instance from '../types/Instance';

class Servers {
  // In-memory cache of servers keyed by FriendlyName
  public static servers: Map<string, Instance> = new Map<string, Instance>();
  private static lastUpdatedAt: number | null = null;

  public static clear(): void {
    this.servers.clear();
    this.lastUpdatedAt = null;
  }

  public static get(name: string): Instance | undefined {
    return this.servers.get(name);
  }

  public static getMap(): Map<string, Instance> {
    return this.servers;
  }

  public static getAll(): Instance[] {
    return Array.from(this.servers.values());
  }

  public static upsert(instance: Instance): void {
    this.servers.set(instance.FriendlyName, instance);
    this.lastUpdatedAt = Date.now();
  }

  public static setAll(instances: Instance[] | Map<string, Instance>): void {
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

  // Returns true if the cache was updated within the provided TTL (in ms)
  public static isFresh(ttlMs: number): boolean {
    if (!this.lastUpdatedAt) return false;
    return Date.now() - this.lastUpdatedAt <= ttlMs;
  }

  public static getLastUpdated(): number | null {
    return this.lastUpdatedAt;
  }
}

export default Servers;