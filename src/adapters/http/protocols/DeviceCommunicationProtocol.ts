import { Effect, succeed, fail, tryPromise, flatMap, catchAll, timeout } from "effect/Effect";
import { DeviceCommunicationProtocol } from "../../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { CommunicationError, DeviceUnreachableError, DeviceActionError } from "../../../ports/devices-management/Errors.js";
import { Device, DeviceActionId, DeviceId, DeviceStatus } from "../../../domain/devices-management/Device.js";
import { pipe } from "effect";
import { millis } from "effect/Duration";

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
      const response = await fetch(deviceAddress.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(5000)
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
      const completeUrl = new URL(deviceAddress.toString() + `/${deviceActionId.toString()}`);
      const response = await fetch(completeUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(input)
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
    throw new Error("Method not implemented.");
  }
}