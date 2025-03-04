import { DeviceEvent, DeviceId } from "./Device.js";
import { DeviceNotFoundError, NotDeviceEventError } from "./Errors.js";

export interface DeviceEventsService {
    publishEvent(deviceId: DeviceId, eventName: string): DeviceNotFoundError | NotDeviceEventError | undefined;
    subscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void;
    unsubscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void;
}
export interface DeviceEventsSubscriber {
    deviceEventPublished(deviceId: DeviceId, event: DeviceEvent): void;
}
