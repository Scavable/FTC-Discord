import Amp from "../amp/ads/Amp";
import Instance from "../types/Instance";

export default class Instances {
  private amp: Amp;

  constructor(amp: Amp) {
    this.amp = amp;
  }

  /**
   * Access Amp getInstances and filter for Minecraft instances.
   */
  async getMinecraftInstances(): Promise<Instance[]> {
    // Accessing Amp getInstances method
    let instances = await this.amp.getInstances();
    instances = await this.amp.readFile(instances);
    
    // Filtering instances by 'MinecraftModule'
    return instances.filter(instance => instance.Group === 'Minecraft');
  }

  async getHytaleInstances(): Promise<Instance[]>{
    const instances = await this.amp.getInstances();
    return instances.filter(instance => instance.Group === 'Hytale');
  }
}
