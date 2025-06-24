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
        'port' in o && typeof o.port === 'number'
}

export interface Options {
    logAnnounces?: boolean
}

export class DeviceDiscovererUDPAdapter implements DeviceDiscoverer {
    private receivedMessages: Map<DeviceId, AnnouncedDevice> = new Map()
    constructor(readonly port: number, readonly rememberDiscoveriesForSeconds: number, { logAnnounces = false }: Options = {}) {
        const socket = dgram.createSocket('udp4', (msg, rinfo) => {
            if (logAnnounces) { console.log(`Announce from ${rinfo.address} - ${msg}`) }
            const obj = JSON.parse(JSON.stringify(msg))
            if (isAnnounceMessage(obj)) {
                this.receivedMessages.set(DeviceId(obj.id), { ...obj, host: rinfo.address, arrivedAt: new Date() })
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
    }

    discoveredDevices(): Iterable<DiscoveredDevice> {
        return Array.from(this.receivedMessages.values())
            .filter(m => m.arrivedAt.getTime() <= this.rememberDiscoveriesForSeconds)
            .map(m => DiscoveredDevice(DeviceId(m.id), m.name, DeviceAddress(m.host, m.port)))
    }
}
