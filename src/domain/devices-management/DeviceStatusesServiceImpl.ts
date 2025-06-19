import { Effect, pipe } from "effect";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "../../ports/devices-management/DeviceStatusesService.js";
import { DeviceStatus } from "./Device.js";

/**
 * Objects of this class when created start polling each device to check whether they are online or not.
 * 
 * Remember to call *stop* in order to stop polling to completely dispose this object
 */
export class DeviceStatusesServiceImpl implements DeviceStatusesService {
    private pollingRateMillis: number
    private devicesService: DevicesService
    private protocol: DeviceCommunicationProtocol

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

        // Inform subscribers and update persisted device status through DevicesService
        await pipe(
            results,
            Effect.forEach(r => Effect.Do.pipe(
                Effect.bind("device", () => this.devicesService.findUnsafe(r.deviceId)),
                Effect.flatMap(({ device }) => Effect.if(device.status == r.status, {
                    onTrue: () => Effect.void,
                    onFalse: () => pipe(
                        this.subscribers,
                        Effect.forEach(s => s.deviceStatusChanged(r.deviceId, r.status), { concurrency: "unbounded" }),
                        Effect.flatMap(() => this.devicesService.setDeviceStatusUnsafe(r.deviceId, r.status)),
                        // If the device is not found at this point there's no reason to throw errors
                        Effect.catchAll(() => Effect.void)
                    )
                })),
                // If the device is not found it's possible that it was deleted and therefore we shouldn't do anything
                Effect.catchAll(() => Effect.void)
            ), { concurrency: "unbounded" }),
            Effect.runPromise
        )
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
