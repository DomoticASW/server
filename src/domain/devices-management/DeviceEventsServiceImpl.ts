import { DeviceEventsService, DeviceEventsSubscriber } from "../../ports/devices-management/DeviceEventsService.js";
import { DeviceNotFoundError, NotDeviceEventError } from "../../ports/devices-management/Errors.js";
import { DeviceEvent, DeviceId } from "./Device.js";
import { DevicesService } from "../../ports/devices-management/DevicesService.js";
import { Effect } from "effect";

export class DeviceEventsServiceImpl implements DeviceEventsService {
    private devicesService: DevicesService;
    private deviceEventsSubscribers: DeviceEventsSubscriber[] = [];

    constructor(devicesService: DevicesService) {
        this.devicesService = devicesService
    }

    publishEvent(deviceId: DeviceId, eventName: string): Effect.Effect<void, DeviceNotFoundError | NotDeviceEventError> {
        return Effect.Do.pipe(
            Effect.bind("device", () => this.devicesService.findUnsafe(deviceId)),
            Effect.bind("_", ({ device }) => Effect.if(device.events.find(e => e.name === eventName) !== undefined, {
                onTrue: () => Effect.succeed(null),
                onFalse: () => Effect.fail(NotDeviceEventError())
            })),
            Effect.tap(() => this.deviceEventsSubscribers.forEach(s => s.deviceEventPublished(deviceId, DeviceEvent(eventName))))
        )
    }
    subscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void {
        this.deviceEventsSubscribers.push(subscriber)
    }
    unsubscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void {
        this.deviceEventsSubscribers = this.deviceEventsSubscribers.filter(s => s !== subscriber)
    }
}