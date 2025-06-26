import { Effect } from "effect/Effect";
import { DeviceEvent, DeviceId } from "../../domain/devices-management/Device.js";
import { DeviceNotFoundError, NotDeviceEventError } from "./Errors.js";

export interface DeviceEventsService {
    publishEvent(deviceId: DeviceId, eventName: string): Effect<void, DeviceNotFoundError | NotDeviceEventError>;
    subscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void;
    unsubscribeForDeviceEvents(subscriber: DeviceEventsSubscriber): void;
}
export interface DeviceEventsSubscriber {
    deviceEventPublished(deviceId: DeviceId, event: DeviceEvent): void;
}
