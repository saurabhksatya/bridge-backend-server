import { type Device } from "./Device.js"
import { type Client } from "./Client.js"

export class Hub {
  public devices = new Map<string, Device>()
  public clients = new Map<string, Client>()

  addDevice(id: string, device: Device) {
    this.devices.set(id, device)
  }

  removeDevice(id: string) {
    this.devices.delete(id)
  }

  getDevice(id: string): Device | undefined {
    return this.devices.get(id)
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  addClient(id: string, client: Client) {
    this.clients.set(id, client)
  }

  removeClient(id: string) {
    this.clients.delete(id)
  }

  getClient(id: string): Client | undefined {
    return this.clients.get(id)
  }

  getAllClients(): Client[] {
    return Array.from(this.clients.values())
  }
}
