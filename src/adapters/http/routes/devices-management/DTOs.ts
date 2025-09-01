import { Effect, pipe } from "effect"
import {
  DeviceStatus,
  Device,
  DeviceAddress,
  DeviceEvent,
  DeviceAction,
  DeviceProperty,
} from "../../../../domain/devices-management/Device.js"
import { DeviceGroup } from "../../../../domain/devices-management/DeviceGroup.js"
import { TypeConstraints } from "../../../../domain/devices-management/Types.js"
import { DevicesService } from "../../../../ports/devices-management/DevicesService.js"
import { Type } from "../../../../ports/devices-management/Types.js"

export interface DeviceGroupDTO {
  readonly id: string
  readonly name: string
  readonly devices: DeviceDTO[]
}
/**
 * Serializes a DeviceGroup into a DTO eagerly loading all devices.
 * Devices that are not found are simply not serialized as they may have been deleted and the group may be out of date.
 */
export function DeviceGroupDTO(
  dg: DeviceGroup,
  devicesService: DevicesService
): Effect.Effect<DeviceGroupDTO> {
  return pipe(
    Effect.allSuccesses(
      dg.devices.map((dId) => devicesService.findUnsafe(dId)),
      { concurrency: "unbounded" }
    ),
    Effect.map((devices) => devices.map((d) => DeviceDTO(d))),
    Effect.map((deviceDTOs) => {
      return {
        id: dg.id,
        name: dg.name,
        devices: deviceDTOs,
      }
    })
  )
}

export interface DeviceDTO {
  id: string
  name: string
  address: DeviceAddressDTO
  status: DeviceStatus
  properties: DevicePropertyDTO[]
  actions: DeviceActionDTO[]
  events: DeviceEventDTO[]
}
export function DeviceDTO(d: Device): DeviceDTO {
  return {
    id: d.id,
    name: d.name,
    address: DeviceAddressDTO(d.address),
    status: d.status,
    properties: d.properties.map((p) => DevicePropertyDTO(p)),
    actions: d.actions.map((a) => DeviceActionDTO(a)),
    events: d.events.map((e) => DeviceEventDTO(e)),
  }
}

export interface DeviceAddressDTO {
  host: string
  port: number
}
function DeviceAddressDTO(a: DeviceAddress): DeviceAddressDTO {
  return { host: a.host, port: a.port }
}

export interface DeviceEventDTO {
  name: string
}
function DeviceEventDTO(e: DeviceEvent): DeviceEventDTO {
  return { name: e.name }
}

export interface DeviceActionDTO {
  id: string
  name: string
  description?: string
  inputTypeConstraints: TypeConstraintsDTO
}
function DeviceActionDTO(a: DeviceAction<unknown>): DeviceActionDTO {
  const itc = TypeConstraintsDTO(a.inputTypeConstraints)
  return { id: a.id, name: a.name, description: a.description, inputTypeConstraints: itc }
}

export interface DevicePropertyDTO {
  id: string
  name: string
  value: unknown
  setter?: DeviceActionDTO
  typeConstraints: TypeConstraintsDTO
}
function DevicePropertyDTO(p: DeviceProperty<unknown>): DevicePropertyDTO {
  const tc = TypeConstraintsDTO(p.typeConstraints)
  const setter = p.setter ? DeviceActionDTO(p.setter) : undefined
  return { id: p.id, name: p.name, value: p.value, setter: setter, typeConstraints: tc }
}

type TypeConstraintsDTO =
  | EnumTypeConstraintDTO
  | IntRangeTypeConstraintDTO
  | DoubleRangeTypeConstraintDTO
  | NoneTypeConstraintDTO
function TypeConstraintsDTO(tc: TypeConstraints<unknown>): TypeConstraintsDTO {
  switch (tc.__brand) {
    case "Enum":
      return {
        __brand: "Enum",
        type: tc.type,
        values: Array.from(tc.values),
      } as EnumTypeConstraintDTO
    case "IntRange":
    case "DoubleRange":
      return { __brand: tc.__brand, type: tc.type, min: tc.min, max: tc.max } as
        | IntRangeTypeConstraintDTO
        | DoubleRangeTypeConstraintDTO
    case "None":
      return { __brand: "None", type: tc.type } as NoneTypeConstraintDTO
  }
}

export interface TypeConstraintDTO {
  type: Type
}

export interface EnumTypeConstraintDTO extends TypeConstraintDTO {
  __brand: "Enum"
  values: string[]
}
export interface IntRangeTypeConstraintDTO extends TypeConstraintDTO {
  __brand: "IntRange"
  min: number
  max: number
}
export interface DoubleRangeTypeConstraintDTO extends TypeConstraintDTO {
  __brand: "DoubleRange"
  min: number
  max: number
}
export interface NoneTypeConstraintDTO extends TypeConstraintDTO {
  __brand: "None"
}

export function isDeviceAddress(a: unknown): a is DeviceAddress {
  return (
    a != null &&
    typeof a == "object" &&
    "host" in a &&
    typeof a.host == "string" &&
    "port" in a &&
    Number.isInteger(a.port)
  )
}

type UpdateDevicePropertiesBody = Array<UpdateDevicePropertyItem>
export interface UpdateDevicePropertyItem {
  propertyId: string
  value: unknown
}
export function isUpdateDevicePropertiesBody(o: unknown): o is UpdateDevicePropertiesBody {
  return (
    o != undefined &&
    Array.isArray(o) &&
    (o.length == 0 || o.map((e) => isUpdateDevicePropertyItem(e)).reduce((a, b) => a && b))
  )
}
function isUpdateDevicePropertyItem(o: unknown): o is UpdateDevicePropertyItem {
  return (
    o != undefined &&
    typeof o == "object" &&
    "propertyId" in o &&
    typeof o.propertyId == "string" &&
    "value" in o
  )
}
