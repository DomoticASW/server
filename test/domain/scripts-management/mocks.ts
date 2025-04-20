/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect } from "effect/Effect";
import { Device, DeviceActionId, DeviceId, DevicePropertyId, DeviceStatus } from "../../../src/domain/devices-management/Device.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import { Email } from "../../../src/domain/users-management/User.js";
import { DeviceActionError, DeviceActionNotFound, DeviceNotFoundError, DevicePropertyNotFound, DeviceUnreachableError, InvalidInputError } from "../../../src/ports/devices-management/Errors.js";
import { NotificationsService } from "../../../src/ports/notifications-management/NotificationsService.js";
import { InvalidTokenError, TokenError, UserNotFoundError } from "../../../src/ports/users-management/Errors.js";
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../../src/ports/devices-management/DevicesService.js";
import { PermissionError } from "../../../src/ports/permissions/Errors.js";
import { ScriptsService } from "../../../src/ports/scripts-management/ScriptsService.js";
import { TaskId, Task, AutomationId, Automation } from "../../../src/domain/scripts-management/Script.js";
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js";
import { ScriptNotFoundError, TaskNameAlreadyInUse, InvalidTaskError, AutomationNameAlreadyInUse, InvalidAutomationError } from "../../../src/ports/scripts-management/Errors.js";
import { succeed, fail } from "effect/Exit";

export function UserNotFoundErrorMock(cause?: string): UserNotFoundError {
  return { message: "The user has not been found", cause: cause, __brand: "UserNotFoundError" }
}

export interface Spy<T> {
  call(): number
  get(): T
}

export function Spy<T>(object: T): Spy<T> {
  return {
    call: () => 0,
    get: () => object
  }
}

export function NotificationsServiceSpy(existingEmail: Email): Spy<NotificationsService> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        subscribeForDeviceOfflineNotifications: function (token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
          return succeed(null)
        },
        unsubscribeForDeviceOfflineNotifications: function (token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | InvalidTokenError> {
          return succeed(null)
        },
        sendNotification: function (email: Email, message: string): Effect<void, UserNotFoundError> {
          call++
          return email == existingEmail ? succeed(null) : fail(UserNotFoundErrorMock())
        },
        deviceStatusChanged: function (deviceId: DeviceId, status: DeviceStatus): void {
        }
      }
    }
  }
}

export function ScriptsServiceMock(): ScriptsService {
  return {
    findTask: function (token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError> {
      throw new Error("Function not implemented.");
    },
    getAllTasks: function (token: Token): Effect<Iterable<Task>, InvalidTokenError> {
      throw new Error("Function not implemented.");
    },
    createTask: function (token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUse | InvalidTaskError> {
      throw new Error("Function not implemented.");
    },
    editTask: function (token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUse | InvalidTaskError> {
      throw new Error("Function not implemented.");
    },
    executeTask: function (token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
      return succeed(null)
    },
    findAutomation: function (token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError> {
      throw new Error("Function not implemented.");
    },
    getAllAutomations: function (token: Token): Effect<Iterable<Automation>, InvalidTokenError> {
      throw new Error("Function not implemented.");
    },
    createAutomation: function (token: Token, automation: TaskBuilder): Effect<AutomationId, InvalidTokenError | ScriptNotFoundError | AutomationNameAlreadyInUse | InvalidAutomationError> {
      throw new Error("Function not implemented.");
    },
    editAutomation: function (token: Token, automationId: AutomationId, automation: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUse | InvalidAutomationError> {
      throw new Error("Function not implemented.");
    },
    setAutomationState: function (token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError> {
      throw new Error("Function not implemented.");
    }
  }
}

export function DevicesServiceMock(): DevicesService {
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
      throw new Error("Function not implemented.");
    },
    getAllDevices: function (token: Token): Effect<Iterable<Device>, InvalidTokenError> {
      throw new Error("Function not implemented.");
    },
    executeAction: function (token: Token, deviceId: DeviceId, actionId: DeviceActionId, input: unknown): Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound | DeviceNotFoundError | InvalidTokenError | PermissionError> {
      return succeed(null)
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