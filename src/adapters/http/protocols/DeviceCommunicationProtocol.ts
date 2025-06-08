import { Effect, succeed, fail, tryPromise, flatMap, catchAll, timeout, map } from "effect/Effect";
import { DeviceCommunicationProtocol } from "../../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { CommunicationError, DeviceUnreachableError, DeviceActionError } from "../../../ports/devices-management/Errors.js";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DeviceStatus } from "../../../domain/devices-management/Device.js";
import { pipe } from "effect";
import { millis } from "effect/Duration";
import { TimeoutException } from "effect/Cause";

class TimeoutError {
    constructor() {
    }
}

export class DeviceCommunicationProtocolImpl implements DeviceCommunicationProtocol {
    private deviceUrl: URL;
    private deviceId: DeviceId;
    private devicesService: DevicesService;

    constructor(deviceUrl: URL, deviceId: DeviceId, devicesService: DevicesService) {
        this.deviceUrl = deviceUrl;
        this.deviceId = deviceId;
        this.devicesService = devicesService;
    }

  checkDeviceStatus(deviceAddress: URL): Effect<DeviceStatus, CommunicationError> {
    const promise = async () => {
      const response = await fetch(deviceAddress.toString() + `/check-status`, {
        method: "GET",
      });
      return response;
    };

    return pipe(
      tryPromise({
        try: promise,
        catch: (e) => {
          if (e instanceof Error && e.name === "TimeoutError") {
            return new TimeoutError();
          }
          return CommunicationError();
        }
      }),
      timeout(millis(5000)),
      flatMap(response => {
        if (response.ok) {
          return succeed(DeviceStatus.Online);
        } else {
          return fail(CommunicationError());
        }
      }),
      catchAll((e): Effect<DeviceStatus, CommunicationError> => {
        if (e instanceof TimeoutError) {
          return succeed(DeviceStatus.Offline);
        } else {
          return fail(CommunicationError(e.message));
        }
      })
    );
  }

  executeDeviceAction(deviceAddress: URL, deviceActionId: DeviceActionId, input: unknown): Effect<void, DeviceUnreachableError | CommunicationError | DeviceActionError> {
    const promise = async () => {
      const completeUrl = new URL(deviceAddress.toString() + `/execute/${deviceActionId.toString()}`);
      const response = await fetch(completeUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input: input })
      });
      return response;
    }

    return pipe(
      tryPromise({
        try: promise,
        catch: (e) => {
          if (e instanceof Error && e.name === "TimeoutError") {
            return DeviceUnreachableError();
          }
          return CommunicationError();
        }
      }),
      timeout(millis(5000)),
      flatMap(response => {
        if (response.ok) {
          return succeed(undefined);
        }
        return fail(CommunicationError());
      }),
       catchAll((e): Effect<void, DeviceActionError | DeviceUnreachableError | CommunicationError> => {
        if (e instanceof DeviceUnreachableError) {
          return fail(DeviceUnreachableError());
        }
        switch (e instanceof CommunicationError) {
          case (e.cause === "404"): 
            return fail(DeviceActionError());
          default:
            return fail(CommunicationError());
        }
      })
    );
  }

  register(deviceAddress: URL): Effect<Device, DeviceUnreachableError | CommunicationError> {
    const promise = async () => {
      const response = await fetch(deviceAddress.toString() + `/register`, {
        method: "GET",
      });
      return response;
    };

    return pipe(
      tryPromise({
        try: promise,
        catch: () => CommunicationError()
      }),
      timeout(millis(5000)),
      flatMap(response => {
        if (response.ok) {
          return tryPromise({
            try: () => response.json(),
            catch: () => {
              return CommunicationError();
            }
          }).pipe(
            map((data) => {
              const properties = data.properties.map((property: DeviceProperty<unknown>) => 
                  DeviceProperty(
                    property.id,
                    property.name,
                    property.value,
                    property.setter ?? property.typeConstraints
                  )
                );
              const actions = data.actions.map((action: DeviceAction<unknown>) => 
                  DeviceAction(
                    action.id,
                    action.name,
                    action.inputTypeConstraints,
                    action.description
                  )
                );
              const events = data.events.map((eventName: string) => 
                DeviceEvent(eventName) 
              );
              return Device(this.deviceId, data.name, this.deviceUrl, DeviceStatus.Online, properties, actions, events);
            })
          );
        } else {
          return fail(CommunicationError());
        }
      }),
      catchAll((e): Effect<Device, DeviceUnreachableError | CommunicationError> => {
        if (e instanceof TimeoutException) {
          return fail(DeviceUnreachableError());
        } else {
          return fail(CommunicationError());
        }
      })
    )
  };
}