/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect } from "effect/Effect";
import { succeed } from "effect/Exit";
import { Device, DeviceId, DeviceActionId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import { DevicesService, DevicePropertyUpdatesSubscriber } from "../../../src/ports/devices-management/DevicesService.js";
import { DeviceUnreachableError, DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceActionNotFound, DevicePropertyNotFound } from "../../../src/ports/devices-management/Errors.js";
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js";
import { TokenError, InvalidTokenError, EmailAlreadyInUseError, InvalidCredentialsError, InvalidTokenFormatError, UserNotFoundError } from "../../../src/ports/users-management/Errors.js";
import { Spy } from "../../utils/spy.js";
import { DeviceMock, TokenMock } from "../scripts-management/mocks.js";
import { DeviceStatusChangesSubscriber, DeviceStatusesService } from "../../../src/ports/devices-management/DeviceStatusesService.js";
import { UsersService } from "../../../src/ports/users-management/UserService.js";
import { Nickname, Email, PasswordHash, User } from "../../../src/domain/users-management/User.js";

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

export function UsersServiceSpy(userToken: Token = TokenMock("Email")): Spy<UsersService> {
  let call = 0
  return {
    call: () => call,
    get: function (): UsersService {
      return {
        publishRegistrationRequest: function (nickname: Nickname, email: Email, password: PasswordHash): Effect<void, EmailAlreadyInUseError> {
          throw new Error("Function not implemented.");
        },
        approveRegistrationRequest: function (token: Token, email: Email): Effect<void, UserNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        rejectRegistrationRequest: function (token: Token, email: Email): Effect<void, UserNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        removeUser: function (token: Token, email: Email): Effect<void, UserNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        updateUserData: function (token: Token, nickname?: Nickname, email?: Email, password?: PasswordHash): Effect<void, UserNotFoundError | EmailAlreadyInUseError | TokenError> {
          throw new Error("Function not implemented.");
        },
        getAllUsers: function (token: Token): Effect<Iterable<User>, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        getUserData: function (token: Token): Effect<User, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        login: function (email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError> {
          throw new Error("Function not implemented.");
        },
        verifyToken: function (token: Token): Effect<void, InvalidTokenError> {
          call++
          return token == userToken ? succeed(null) : fail(InvalidTokenErrorMock())
        },
        makeToken: function (value: string): Effect<Token, InvalidTokenFormatError> {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}