/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect } from "effect/Effect";
import { Device, DeviceAction, DeviceActionId, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "../../../src/domain/devices-management/Device.js";
import { Token, UserRole } from "../../../src/domain/users-management/Token.js";
import { Email } from "../../../src/domain/users-management/User.js";
import { DeviceActionError, DeviceActionNotFound, DeviceNotFoundError, DevicePropertyNotFound, DeviceUnreachableError, InvalidInputError } from "../../../src/ports/devices-management/Errors.js";
import { NotificationsService } from "../../../src/ports/notifications-management/NotificationsService.js";
import { InvalidTokenError, TokenError, UserNotFoundError } from "../../../src/ports/users-management/Errors.js";
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../../src/ports/devices-management/DevicesService.js";
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js";
import { ScriptsService } from "../../../src/ports/scripts-management/ScriptsService.js";
import { TaskId, Task, AutomationId, Automation, ScriptId } from "../../../src/domain/scripts-management/Script.js";
import { TaskBuilder } from "../../../src/domain/scripts-management/ScriptBuilder.js";
import { ScriptNotFoundError, TaskNameAlreadyInUse, InvalidTaskError, AutomationNameAlreadyInUse, InvalidAutomationError, ScriptError } from "../../../src/ports/scripts-management/Errors.js";
import { succeed, fail } from "effect/Exit";
import { ExecutionEnvironment, Instruction } from "../../../src/domain/scripts-management/Instruction.js";
import { NoneInt } from "../../../src/domain/devices-management/Types.js";
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js";
import { Spy } from "../../utils/spy.js";
import { NotificationProtocol } from "../../../src/ports/notifications-management/NotificationProtocol.js";

export function UserNotFoundErrorMock(cause?: string): UserNotFoundError {
  return { message: "The user has not been found", cause: cause, __brand: "UserNotFoundError" }
}

export function TokenMock(email: string): Token {
  return {
    userEmail: Email(email),
    role: UserRole.Admin
  }
}

export function NotificationsServiceSpy(existingEmail: Email): Spy<NotificationsService> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        subscribeForDeviceOfflineNotifications: function (email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
          return succeed(null)
        },
        unsubscribeForDeviceOfflineNotifications: function (email: Email, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError> {
          return succeed(null)
        },
        sendNotification: function (email: Email, message: string): Effect<void, UserNotFoundError> {
          call++
          return email == existingEmail ? succeed(null) : fail(UserNotFoundErrorMock())
        },
        deviceStatusChanged: function (deviceId: DeviceId, status: DeviceStatus): Effect<void> {
          return succeed(null)
        },
        setupNotificationProtocol(notificationProtocol: NotificationProtocol): void {
          
        }
      }
    }
  }
}

export function SpyTaskMock(hasToFail: boolean = false): Spy<Task> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        id: TaskId("id"),
        name: "",
        instructions: [],
        execute: function (token?: Token): Effect<ExecutionEnvironment, ScriptError> {
          call++
          return hasToFail ? fail(ScriptError()) : succeed(ExecutionEnvironment(token))
        }
      }
    }
  }
}

export function ScriptsServiceSpy(task: Task, isTask: boolean = false): Spy<ScriptsService> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        findTask: function (token: Token, taskId: TaskId): Effect<Task, InvalidTokenError | ScriptNotFoundError> {
          if (isTask) call++
          return taskId == task.id ? succeed(task) : fail(ScriptNotFoundError())
        },
        findTaskUnsafe: function (taskId: TaskId): Effect<Task, ScriptNotFoundError> {
          if (!isTask) call++
          return taskId == task.id ? succeed(task) : fail(ScriptNotFoundError())
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
        startTask: function (token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
          throw new Error("Function not implemented.");
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
  }
}

export function PermissionsServiceSpy(userToken: Token = TokenMock("email")): Spy<PermissionsService> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        addUserDevicePermission: function (token: Token, email: Email, devideId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        removeUserDevicePermission: function (token: Token, email: Email, deviceId: DeviceId): Effect<void, UserNotFoundError | DeviceNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        canExecuteActionOnDevice: function (token: Token, deviceId: DeviceId): Effect<void, PermissionError | InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        canExecuteTask: function (token: Token, taskId: TaskId): Effect<void, PermissionError | InvalidTokenError> {
          call++
          return token == userToken ? succeed(null) : fail(PermissionError())
        },
        canEdit: function (token: Token, scriptId: ScriptId): Effect<void, PermissionError | InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        addToEditlist: function (token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        removeFromEditlist: function (token: Token, email: Email, scriptId: ScriptId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        addToWhitelist: function (token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        removeFromWhitelist: function (token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        addToBlacklist: function (token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        removeFromBlacklist: function (token: Token, email: Email, taskId: TaskId): Effect<void, TokenError | UserNotFoundError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}

export function DeviceMock(eventName: string = ""): Device {
  return {
    id: DeviceId("id"),
    name: "name",
    address: URL.prototype,
    status: DeviceStatus.Online,
    properties: [
      DevicePropertyMock()
    ],
    actions: [
      DeviceActionMock()
    ],
    events: [
      DeviceEventMock(eventName),
      DeviceEventMock("otherEvent")
    ],
    executeAction(actionId, input) {
      return succeed(null)
    }
  }
}

function DevicePropertyMock(): DeviceProperty<number> {
  return {
    id: DevicePropertyId("propertyId"),
    name: "",
    value: 10,
    typeConstraints: NoneInt()
  }
}

function DeviceActionMock(): DeviceAction<unknown> {
  return {
    id: DeviceActionId("actionId"),
    name: "",
    inputTypeConstraints: NoneInt(),
    execute: function (input: unknown): Effect<void, InvalidInputError | DeviceActionError> {
      throw new Error("Function not implemented.");
    }
  }
}

function DeviceEventMock(name: string): DeviceEvent {
  return {
    name: name
  }
}

export function DevicesServiceSpy(device: Device = DeviceMock(), testingAction: boolean = true): Spy<DevicesService> {
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
          throw new Error("Function not implemented.");
        },
        findUnsafe: function (deviceId: DeviceId): Effect<Device, DeviceNotFoundError> {
          if (!testingAction) {
            call++
          }
          return device.id == deviceId ? succeed(device) : fail(DeviceNotFoundError())
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
          if (testingAction) {
            call++
          }
          return deviceId == device.id ? succeed(null) : fail(DeviceNotFoundError())
        },
        updateDeviceProperty: function (deviceId: DeviceId, propertyId: DevicePropertyId, value: unknown): Effect<void, DeviceNotFoundError | DevicePropertyNotFound> {
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

export function InstructionSpy(): Spy<Instruction> {
  let call = 0
  return {
    call: () => call,
    get: () => {
      return {
        execute(env) {
          call++
          return succeed(env)
        },
      }
    }
  }
}