import { Effect, pipe } from "effect";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DeviceId, DeviceStatus } from "./Device.js";

/**
 * Objects of this class when created start polling each device to check whether they are online or not.
 * 
 * Remember to call *stop* in order to stop polling to completely dispose this object
 */
export class DeviceStatusesServiceImpl implements DeviceStatusesService {
    private pollingRateMillis: number
    private devicesService: DevicesService
    private protocol: DeviceCommunicationProtocol

    private deviceLastStatuses: Map<DeviceId, DeviceStatus> = new Map()
    private shouldStop = false
    private subscribers: DeviceStatusChangesSubscriber[] = []

    constructor(pollingRateMillis: number, devicesService: DevicesService, protocol: DeviceCommunicationProtocol) {
        this.pollingRateMillis = pollingRateMillis
        this.devicesService = devicesService
        this.protocol = protocol
        this.startPolling()
    }

    private startPolling(): void {
        if (!this.shouldStop) {
            // here we do not await since that would result in a wrong polling interval
            this.pollAllDevices()
            setTimeout(() => this.startPolling(), this.pollingRateMillis)
        }
    }

    private async pollAllDevices(): Promise<void> {
        const results = await Effect.Do.pipe(
            Effect.bind("devicesIterable", () => this.devicesService.getAllDevicesUnsafe()),
            Effect.let("devices", ({ devicesIterable }) => Array.from(devicesIterable)),
            Effect.bind("statuses", ({ devices }) =>
                Effect.all(
                    devices.map(d => pipe(
                        this.protocol.checkDeviceStatus(d.address),
                        Effect.catchAll(() => Effect.succeed(DeviceStatus.Offline)),
                        Effect.map(s => { return { deviceId: d.id, status: s } })
                    ))
                )
            ),
            Effect.map(({ statuses }) => statuses),
            Effect.runPromise
        )

        // compute which devices changed their status
        const changed = results.filter(r => {
            const lastStatus = this.deviceLastStatuses.get(r.deviceId)
            if (lastStatus) {
                // device has changed status?
                return lastStatus != r.status
            } else {
                // new device
                return true
            }
        })

        // update map
        this.deviceLastStatuses.clear()
        results.forEach(r => this.deviceLastStatuses.set(r.deviceId, r.status))

        // inform subscribers only about changed statuses
        changed.forEach(result =>
            this.subscribers.forEach(s => s.deviceStatusChanged(result.deviceId, result.status))
        );
    }

    stop(): void {
        this.shouldStop = true
    }
    subscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void {
        this.subscribers.push(subscriber)
    }
    unsubscribeForDeviceStatusChanges(subscriber: DeviceStatusChangesSubscriber): void {
        this.subscribers = this.subscribers.filter(s => s !== subscriber)
    }
}
