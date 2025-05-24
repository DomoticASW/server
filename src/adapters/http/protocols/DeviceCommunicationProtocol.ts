import { Effect, succeed, fail, tryPromise, flatMap, catchAll } from "effect/Effect";
import { DeviceCommunicationProtocol } from "../../../ports/devices-management/DeviceCommunicationProtocol.js";
import { DevicesService } from "../../../ports/devices-management/DevicesService.js";
import { CommunicationError, DeviceUnreachableError, DeviceActionError } from "../../../ports/devices-management/Errors.js";
import { Device, DeviceActionId, DeviceId, DeviceStatus } from "../../../domain/devices-management/Device.js";
import { pipe } from "effect";

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(deviceAddress.toString(), {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (e) {
        clearTimeout(timeoutId);
        return e;
      }
    };

    return pipe(
      tryPromise(promise),
      flatMap(response => {
        if (response instanceof Response) {
          if (response.ok) {
            return succeed(DeviceStatus.Online);
          } else {
            return succeed(DeviceStatus.Offline);
          }
        } else {
          return fail(CommunicationError());
        }
      }),
      catchAll(() => fail(CommunicationError()))
    );
  }

  executeDeviceAction(deviceAddress: URL, deviceActionId: DeviceActionId, input: unknown): Effect<void, DeviceUnreachableError | CommunicationError | DeviceActionError> {
    const promise = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const completeUrl = new URL(deviceAddress.toString() + `/${deviceActionId.toString()}`);

      try {
        const response = await fetch(completeUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify(input)
        });
        clearTimeout(timeoutId);
        return response;
      } catch (e) {
        clearTimeout(timeoutId);
        return e;
      }
    }

    return pipe(
      tryPromise(promise),
      flatMap(response => {
        if (response instanceof Response) {
          if (response.ok) {
            return succeed(undefined);
          } else {
            return fail(CommunicationError());
          }
        }
        return fail(CommunicationError());
      }),
       catchAll((e): Effect<void, DeviceActionError | DeviceUnreachableError | CommunicationError> => {
        switch (e instanceof CommunicationError) {
          case (e.cause === "404"): 
            return fail(DeviceActionError());
          case (e.cause === "500"):
            return fail(DeviceUnreachableError());
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