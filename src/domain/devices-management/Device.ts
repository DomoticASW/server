import {
  InvalidInputError,
  DeviceActionError,
  DeviceActionNotFound,
} from "../../ports/devices-management/Errors.js"
import { isColor, TypeConstraints } from "../../domain/devices-management/Types.js"
import { Brand } from "../../utils/Brand.js"
import { Effect, pipe } from "effect"
import { Type } from "../../ports/devices-management/Types.js"
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js"

export type DeviceId = Brand<string, "DeviceId">
export type DeviceActionId = Brand<string, "DeviceActionId">
export type DevicePropertyId = Brand<string, "DevicePropertyId">

export function DeviceId(id: string): DeviceId {
  return id as DeviceId
}
export function DeviceActionId(id: string): DeviceActionId {
  return id as DeviceActionId
}
export function DevicePropertyId(id: string): DevicePropertyId {
  return id as DevicePropertyId
}

export interface DeviceAddress {
  readonly host: string
  readonly port: number
}
/** If a non-int port is passed it will be truncated */
export function DeviceAddress(host: string, port: number): DeviceAddress {
  return { host: host, port: Math.trunc(port) }
}

export enum DeviceStatus {
  Online = "Online",
  Offline = "Offline",
}

export interface Device {
  readonly id: DeviceId
  name: string
  readonly address: DeviceAddress

  status: DeviceStatus
  readonly properties: DeviceProperty<unknown>[]
  readonly actions: DeviceAction<unknown>[]
  readonly events: DeviceEvent[]

  executeAction(
    actionId: DeviceActionId,
    input: unknown,
    communicationProtocol: DeviceCommunicationProtocol
  ): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound>
}

class DeviceImpl implements Device {
  id: DeviceId
  name: string
  address: DeviceAddress
  status: DeviceStatus
  properties: DeviceProperty<unknown>[]
  actions: DeviceAction<unknown>[]
  events: DeviceEvent[]

  constructor(
    id: DeviceId,
    name: string,
    address: DeviceAddress,
    status: DeviceStatus,
    properties: DeviceProperty<unknown>[],
    actions: DeviceAction<unknown>[],
    events: DeviceEvent[]
  ) {
    this.id = id
    this.name = name
    this.address = address
    this.status = status
    this.properties = properties
    this.actions = actions
    this.events = events
  }

  executeAction(
    actionId: DeviceActionId,
    input: unknown,
    protocol: DeviceCommunicationProtocol
  ): Effect.Effect<void, InvalidInputError | DeviceActionError | DeviceActionNotFound> {
    const action = this.actions.find((a) => a.id === actionId)
    if (!action) {
      return Effect.fail(
        DeviceActionNotFound(`Action with id ${actionId} does not exist on device "${this.name}"`)
      )
    }

    let invalidInputErrorCause: string | undefined
    switch (action.inputTypeConstraints.type) {
      case Type.BooleanType:
        if (typeof input !== "boolean")
          invalidInputErrorCause = "This action only accepts boolean inputs"
        break

      case Type.IntType:
        if (!Number.isInteger(input))
          invalidInputErrorCause = "This action only accepts integer inputs"
        break

      case Type.DoubleType:
        if (typeof input !== "number")
          invalidInputErrorCause = "This action only accepts double inputs"
        break

      case Type.StringType:
        if (typeof input !== "string")
          invalidInputErrorCause = "This action only accepts string inputs"
        break

      case Type.ColorType:
        if (typeof input === "object" && !isColor(input))
          invalidInputErrorCause = "This action only accepts RGB color inputs"
        break

      case Type.VoidType:
        if (input !== undefined && input !== null)
          invalidInputErrorCause = "This action does not accept any input"
        break
    }
    if (invalidInputErrorCause) {
      return Effect.fail(InvalidInputError(invalidInputErrorCause))
    }
    return pipe(
      // Don't ask me why validate wants a never, thanks TypeScript
      action.inputTypeConstraints.validate(input as never),
      Effect.flatMap(() => protocol.executeDeviceAction(this.address, actionId, input)),
      Effect.mapError((err) => {
        switch (err.__brand) {
          case "InvalidValueError":
            return InvalidInputError(err.cause)
          case "DeviceUnreachableError":
          case "CommunicationError":
            return DeviceActionError(`${err.message}\n${err.cause}`)
          default:
            return err
        }
      })
    )
  }
}

export function Device(
  id: DeviceId,
  name: string,
  address: DeviceAddress,
  status: DeviceStatus,
  properties: DeviceProperty<unknown>[],
  actions: DeviceAction<unknown>[],
  events: DeviceEvent[]
): Device {
  return new DeviceImpl(id, name, address, status, properties, actions, events)
}

export interface DeviceProperty<T> {
  readonly id: DevicePropertyId
  readonly name: string
  value: T

  readonly setter?: DeviceAction<T>
  readonly typeConstraints: TypeConstraints<T>
}
export function DeviceProperty<T>(
  id: DevicePropertyId,
  name: string,
  value: T,
  setterOrTypeConstraints: DeviceAction<T> | TypeConstraints<T>
): DeviceProperty<T> {
  // used to discriminate setterOrTypeConstraints
  function isDeviceAction<T>(obj: DeviceAction<T> | TypeConstraints<T>): obj is DeviceAction<T> {
    return "id" in obj
  }
  if (isDeviceAction(setterOrTypeConstraints)) {
    return {
      id: id,
      name: name,
      value: value,
      setter: setterOrTypeConstraints,
      typeConstraints: setterOrTypeConstraints.inputTypeConstraints,
    }
  } else {
    return {
      id: id,
      name: name,
      value: value,
      setter: undefined,
      typeConstraints: setterOrTypeConstraints,
    }
  }
}

export interface DeviceAction<T> {
  readonly id: DeviceActionId
  readonly name: string
  readonly description?: string

  readonly inputTypeConstraints: TypeConstraints<T>
}
class DeviceActionImpl<T> implements DeviceAction<T> {
  id: DeviceActionId
  name: string
  description?: string
  inputTypeConstraints: TypeConstraints<T>
  constructor(
    id: DeviceActionId,
    name: string,
    inputTypeConstraints: TypeConstraints<T>,
    description?: string
  ) {
    this.id = id
    this.name = name
    this.inputTypeConstraints = inputTypeConstraints
    this.description = description
  }
}
export function DeviceAction<T>(
  id: DeviceActionId,
  name: string,
  inputTypeConstraints: TypeConstraints<T>,
  description?: string
): DeviceAction<T> {
  return new DeviceActionImpl(id, name, inputTypeConstraints, description)
}

export interface DeviceEvent {
  readonly name: string
}
export function DeviceEvent(name: string): DeviceEvent {
  return { name: name }
}
