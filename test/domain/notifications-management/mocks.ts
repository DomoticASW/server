/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect } from "effect/Effect";
import { succeed } from "effect/Exit";
import { Device, DeviceId, DeviceActionId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import { DevicesService, DevicePropertyUpdatesSubscriber } from "../../../src/ports/devices-management/DevicesService.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DevicePropertyNotFound } from "../../../src/ports/devices-management/Errors.js";
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js";
import { TokenError, InvalidTokenError } from "../../../src/ports/users-management/Errors.js";
import { Spy } from "../../utils/spy.js";
import { DeviceMock, TokenMock } from "../scripts-management/mocks.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "../../../src/ports/devices-management/DeviceStatusesService.js";

export function InvalidTokenErrorMock(cause?: string): InvalidTokenError {
  return {
    message: "Invalid token",
    cause: cause,
    __brand: "InvalidTokenError"
  }
}

export function DevicesServiceSpy(userToken: Token = TokenMock("Email"), device: Device = DeviceMock(), testingAction: boolean = true): Spy<DevicesService> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        add: function (token: Token, deviceUrl: URL): Effect<DeviceId, DeviceUnreachableError | TokenError> {
          throw new Error("Function not implemented.");
        },
        remove: function (token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        rename: function (token: Token, deviceId: DeviceId, name: string): Effect<void, DeviceNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        find: function (token: Token, deviceId: DeviceId): Effect<Device, DeviceNotFoundError | InvalidTokenError> {
          call++
          return userToken == token ? device.id == deviceId ? succeed(device) : fail(DeviceNotFoundError()): fail(InvalidTokenErrorMock())
        },
        findUnsafe: function (deviceId: DeviceId): Effect<Device, DeviceNotFoundError> {
          throw new Error("Function not implemented.");          
        },
        getAllDevices: function (token: Token): Effect<Iterable<Device>, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        getAllDevicesUnsafe: function (): Effect<Iterable<Device>, never> {
          throw new Error("Function not implemented.");
        },
        executeAction: function (token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError> {
          throw new Error("Function not implemented.");
        },
        executeAutomationAction: function (deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError> {
          throw new Error("Function not implemented.");
        },
        updateDeviceProperty: function (deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect<void, InvalidInputError | DeviceNotFoundError | DevicePropertyNotFound> {
          throw new Error("Function not implemented.");
        },
        subscribeForDevicePropertyUpdates: function (subscriber: DevicePropertyUpdatesSubscriber): void {
          throw new Error("Function not implemented.");
        },
        unsubscribeForDevicePropertyUpdates: function (subscriber: DevicePropertyUpdatesSubscriber): void {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}

export function DeviceStatusesServicespy(): Spy<DeviceStatusesService> {
  let call = 0
  return {
    call: () => call,
    get: function (): DeviceStatusesService {
      return {
        subscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {
          call++
        },
        unsubscribeForDeviceStatusChanges: function (subscriber: DeviceStatusChangesSubscriber): void {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}