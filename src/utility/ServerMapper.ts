import Amp from '../amp/Amp';
import Instance from '../types/Instance';

class ServerMapper {
  servers: Map<string, Instance> = new Map();
  amp = Amp.getInstance();
}
