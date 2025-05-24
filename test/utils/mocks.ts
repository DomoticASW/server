/* eslint-disable @typescript-eslint/no-unused-vars */
import { Effect, succeed, fail } from "effect/Effect";
import { DeviceId, DeviceStatus, Device, DeviceProperty, DevicePropertyId, DeviceAction, DeviceActionId, DeviceEvent } from "../../src/domain/devices-management/Device.js";
import { NoneInt } from "../../src/domain/devices-management/Types.js";
import { ExecutionEnvironment, Instruction } from "../../src/domain/scripts-management/Instruction.js";
import { TaskId, AutomationId, Automation, ScriptId, Task } from "../../src/domain/scripts-management/Script.js";
import { AutomationBuilder, TaskBuilder } from "../../src/domain/scripts-management/ScriptBuilder.js";
import { Token } from "../../src/domain/users-management/Token.js";
import { Email, Nickname, PasswordHash, Role, User } from "../../src/domain/users-management/User.js";
import { DevicesService, DevicePropertyUpdatesSubscriber } from "../../src/ports/devices-management/DevicesService.js";
import { DeviceStatusesService, DeviceStatusChangesSubscriber } from "../../src/ports/devices-management/DeviceStatusesService.js";
import { DeviceNotFoundError, InvalidInputError, DeviceActionError, DeviceUnreachableError, DeviceActionNotFound, DevicePropertyNotFound, DeviceAlreadyRegisteredError, NotDeviceEventError } from "../../src/ports/devices-management/Errors.js";
import { NotificationProtocol } from "../../src/ports/notifications-management/NotificationProtocol.js";
import { NotificationsService } from "../../src/ports/notifications-management/NotificationsService.js";
import { PermissionError } from "../../src/ports/permissions-management/Errors.js";
import { PermissionsService } from "../../src/ports/permissions-management/PermissionsService.js";
import { ScriptError, ScriptNotFoundError, TaskNameAlreadyInUseError, InvalidScriptError, AutomationNameAlreadyInUseError } from "../../src/ports/scripts-management/Errors.js";
import { ScriptsService } from "../../src/ports/scripts-management/ScriptsService.js";
import { UserNotFoundError, InvalidTokenError, TokenError, EmailAlreadyInUseError, InvalidCredentialsError, InvalidTokenFormatError } from "../../src/ports/users-management/Errors.js";
import { Spy } from "./spy.js";
import { UsersService } from "../../src/ports/users-management/UsersService.js";
import { DeviceOfflineNotificationSubscriptionRepository } from "../../src/ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js";
import { DeviceOfflineNotificationSubscription } from "../../src/domain/notifications-management/DeviceOfflineNotificationSubscription.js";
import { DuplicateIdError, NotFoundError } from "../../src/ports/Repository.js";
import { DeviceEventsService, DeviceEventsSubscriber } from "../../src/ports/devices-management/DeviceEventsService.js";

export function UserNotFoundErrorMock(cause?: string): UserNotFoundError {
  return { message: "The user has not been found", cause: cause, __brand: "UserNotFoundError" }
}

export function TokenMock(email: string): Token {
  return {
    userEmail: Email(email),
    role: Role.Admin,
    source: "test",
  }
}

export interface MessageReader {
  getMessages(): Array<string>
}

export function NotificationsServiceSpy(existingEmail: Email): Spy<NotificationsService> & MessageReader {
  let call = 0
  const messages: Array<string> = []
  return {
    call: () => call,
    getMessages: () => messages,
    get: () => {
      return {
        subscribeForDeviceOfflineNotifications: function (token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError | InvalidTokenError> {
          return succeed(null)
        },
        unsubscribeForDeviceOfflineNotifications: function (token: Token, deviceId: DeviceId): Effect<void, DeviceNotFoundError | UserNotFoundError| InvalidTokenError> {
          return succeed(null)
        },
        sendNotification: function (email: Email, message: string): Effect<void, UserNotFoundError> {
          call++
          messages.push(message)
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
        execute: function (notificationsService: NotificationsService, scriptsService: ScriptsService, permissionsService: PermissionsService, devicesService: DevicesService, token?: Token): Effect<ExecutionEnvironment, ScriptError> {
          call++
          return hasToFail ? fail(ScriptError()) : succeed(ExecutionEnvironment(notificationsService, scriptsService, permissionsService, devicesService, token))
        }
      }
    }
  }
}

export function ScriptsServiceSpy(task: Task = SpyTaskMock().get(), isTask: boolean = false): Spy<ScriptsService> {
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
        createTask: function (token: Token, task: TaskBuilder): Effect<TaskId, InvalidTokenError | TaskNameAlreadyInUseError | InvalidScriptError> {
          throw new Error("Function not implemented.");
        },
        editTask: function (token: Token, taskId: TaskId, task: TaskBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | TaskNameAlreadyInUseError | InvalidScriptError> {
          throw new Error("Function not implemented.");
        },
        startTask: function (token: Token, taskId: TaskId): Effect<void, InvalidTokenError | ScriptNotFoundError | PermissionError> {
          throw new Error("Function not implemented.");
        },
        removeTask(token, taskId) {
          throw new Error("Function not implemented.");
        },
        findAutomation: function (token: Token, automationId: AutomationId): Effect<Automation, InvalidTokenError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        getAllAutomations: function (token: Token): Effect<Iterable<Automation>, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        createAutomation: function (token: Token, automation: AutomationBuilder): Effect<AutomationId, InvalidTokenError | AutomationNameAlreadyInUseError | InvalidScriptError> {
          throw new Error("Function not implemented.");
        },
        editAutomation: function (token: Token, automationId: AutomationId, automation: AutomationBuilder): Effect<void, InvalidTokenError | PermissionError | ScriptNotFoundError | AutomationNameAlreadyInUseError | InvalidScriptError> {
          throw new Error("Function not implemented.");
        },
        setAutomationState: function (token: Token, automationId: AutomationId, enable: boolean): Effect<void, InvalidTokenError | ScriptNotFoundError> {
          throw new Error("Function not implemented.");
        },
        removeAutomation(token, automationId) {
          throw new Error("Function not implemented.");
        },
      }
    }
  }
}

export function PermissionsServiceSpy(userToken: Token = TokenMock("email"), testEdit: boolean = false, testInvalidToken: boolean = false): Spy<PermissionsService> {
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
        canExecuteTask: function (token: Token, taskId: TaskId): Effect<void, PermissionError | InvalidTokenError | ScriptNotFoundError> {
          if (!testEdit) call++
          return token == userToken ? succeed(true) : fail(testInvalidToken ? InvalidTokenError() :  PermissionError())
        },
        canEdit: function (token: Token, scriptId: ScriptId): Effect<void, PermissionError | InvalidTokenError> {
          if (testEdit) call++
          return token == userToken ? succeed(true) : fail(testInvalidToken ? InvalidTokenError() :  PermissionError())
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
        add: function (token: Token, deviceUrl: URL): Effect<DeviceId, DeviceAlreadyRegisteredError | DeviceUnreachableError | TokenError> {
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

export function DeviceStatusesServiceSpy(): Spy<DeviceStatusesService> {
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

export function UserMock(email: Email = Email("test")): User {
  return {
    email: email,
    role: Role.Admin
  } as unknown as User
}

export function UsersServiceSpy(user: User = UserMock(), usedToken: Token = TokenMock(user.email)): Spy<UsersService> {
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
        updateUserData: function (token: Token, nickname?: Nickname, password?: PasswordHash): Effect<void, UserNotFoundError | TokenError> {
          throw new Error("Function not implemented.");
        },
        getAllUsers: function (token: Token): Effect<Iterable<User>, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        getUserData: function (token: Token): Effect<User, InvalidTokenError> {
          throw new Error("Function not implemented.");
        },
        getUserDataUnsafe: function (email: Email): Effect<User, UserNotFoundError> {
          call++
          return email == user.email ? succeed(user) : fail(UserNotFoundErrorMock())
        },
        login: function (email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError> {
          throw new Error("Function not implemented.");
        },
        verifyToken: function (token: Token): Effect<void, InvalidTokenError> {
          call++
          return usedToken == token ? succeed(null) : fail(InvalidTokenError())
        },
        makeToken: function (value: string): Effect<Token, InvalidTokenFormatError> {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}

export enum RepoOperation {
  ADD, REMOVE, GETALL, NONE
}

export function DeviceOfflineNotificationSubscriptionRepositorySpy(operation: RepoOperation, subscription: DeviceOfflineNotificationSubscription): Spy<DeviceOfflineNotificationSubscriptionRepository> {
  let call = 0
  return {
    call: () => call,
    get: function () : DeviceOfflineNotificationSubscriptionRepository {
      return {
        add: function (entity: DeviceOfflineNotificationSubscription): Effect<void, DuplicateIdError> {
          if (operation == RepoOperation.ADD && subscription.deviceId == entity.deviceId && subscription.email == entity.email) {
            call++
          }
          return succeed(undefined)
        },
        update: function (entity: DeviceOfflineNotificationSubscription): Effect<void, NotFoundError> {
          throw new Error("Function not implemented.");
        },
        remove: function (id: { email: Email; deviceId: DeviceId; }): Effect<void, NotFoundError> {
          if (operation == RepoOperation.REMOVE && id.email == subscription.email && id.deviceId == subscription.deviceId) {
            call++
          }
          return succeed(undefined)
        },
        getAll: function (): Effect<Iterable<DeviceOfflineNotificationSubscription>> {
          if (operation == RepoOperation.GETALL) {
            call++
          }
          return succeed([subscription])
        },
        find: function (id: { email: Email; deviceId: DeviceId; }): Effect<DeviceOfflineNotificationSubscription, NotFoundError, never> {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}

export function NotificationProtocolSpy(): Spy<NotificationProtocol> {
  let call = 0
  return {
    call: () => call,
    get: function (): NotificationProtocol {
      return {
        sendNotification: function (email: Email, message: string): void {
          call++
        }
      }
    }
  }
}

export function DeviceEventsServiceSpy(): Spy<DeviceEventsService> {
  let call = 0
  return {
    call: () => call,
    get: function (): DeviceEventsService {
      return {
        publishEvent: function (deviceId: DeviceId, eventName: string): Effect<void, DeviceNotFoundError | NotDeviceEventError> {
          throw new Error("Function not implemented.");
        },
        subscribeForDeviceEvents: function (subscriber: DeviceEventsSubscriber): void {
          call++
        },
        unsubscribeForDeviceEvents: function (subscriber: DeviceEventsSubscriber): void {
          throw new Error("Function not implemented.");
        }
      }
    }
  }
}
