import dgram from 'dgram';
import { DeviceAddress, DeviceId } from '../../domain/devices-management/Device.js';
import { DeviceDiscoverer } from '../../ports/devices-management/DeviceDiscoverer.js';
import { DiscoveredDevice } from '../../domain/devices-management/DiscoveredDevice.js';

interface AnnounceMessage {
    id: string,
    name: string,
    port: number
}
interface AnnouncedDevice extends AnnounceMessage {
    host: string,
    arrivedAt: Date
}

function isAnnounceMessage(o: unknown): o is AnnounceMessage {
    return typeof o === 'object' && o !== null &&
        'id' in o && typeof o.id === 'string' &&
        'name' in o && typeof o.name === 'string' &&
        'port' in o && Number.isInteger(o.port)
}

export interface Options {
    logAnnounces?: boolean
}

export class DeviceDiscovererUDPAdapter implements DeviceDiscoverer {
    private receivedMessages: Map<string, AnnouncedDevice> = new Map()

    constructor(readonly port: number, readonly rememberDiscoveriesForSeconds: number, { logAnnounces = false }: Options = {}) {
        const socket = dgram.createSocket('udp4', (msg, rinfo) => {
            if (logAnnounces) { console.log(`Announce from ${rinfo.address} - ${msg}`) }
            const obj = JSON.parse(msg.toString())
            if (isAnnounceMessage(obj)) {
                this.receivedMessages.set(obj.id, { ...obj, host: rinfo.address, arrivedAt: new Date() })
            } else {
                if (logAnnounces) { console.log("Announce message format was invalid") }
            }
            if (logAnnounces) { console.log() }
        });

        socket.on('error', (err) => {
            console.error(`UDP socket error:\n${err.stack}`);
            socket.close();
        });

        socket.bind(port)
        process.on("exit", () => socket.close())

        // Clear old messages every once in a while
        setInterval(() => {
            Array.from(this.receivedMessages.values())
                .filter(m => this.announceIsOld(m))
                .forEach(m => this.receivedMessages.delete(m.id))
        }, rememberDiscoveriesForSeconds * 1000 * 2)
    }

    discoveredDevices(): Iterable<DiscoveredDevice> {
        return Array.from(this.receivedMessages.values())
            .filter(m => !this.announceIsOld(m))
            .map(m => DiscoveredDevice(DeviceId(m.id), m.name, DeviceAddress(m.host, m.port)))
    }

    private announceIsOld(a: AnnouncedDevice): boolean {
        return a.arrivedAt.getTime() < new Date().getTime() - this.rememberDiscoveriesForSeconds * 1000
    }
}
