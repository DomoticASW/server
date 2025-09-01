import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type InvalidValueError = Brand<Error, "InvalidValueError">
export function InvalidValueError(cause?: string): InvalidValueError {
  return { message: "The given value is not valid", cause: cause, __brand: "InvalidValueError" }
}
export type InvalidInputError = Brand<Error, "InvalidInputError">
export function InvalidInputError(cause?: string): InvalidInputError {
  return {
    message: "The given value is not valid a valid input",
    cause: cause,
    __brand: "InvalidInputError",
  }
}
export type DeviceActionError = Brand<Error, "DeviceActionError">
export function DeviceActionError(cause?: string): DeviceActionError {
  return {
    message: "Something went wrong while executing this action",
    cause: cause,
    __brand: "DeviceActionError",
  }
}
export type DeviceActionNotFound = Brand<Error, "DeviceActionNotFound">
export function DeviceActionNotFound(cause?: string): DeviceActionNotFound {
  return {
    message: "This device action was not found",
    cause: cause,
    __brand: "DeviceActionNotFound",
  }
}
export type DevicePropertyNotFound = Brand<Error, "DevicePropertyNotFound">
export function DevicePropertyNotFound(cause?: string): DevicePropertyNotFound {
  return {
    message: "This device property was not found",
    cause: cause,
    __brand: "DevicePropertyNotFound",
  }
}
export type DeviceGroupNameAlreadyInUseError = Brand<Error, "DeviceGroupNameAlreadyInUseError">
export function DeviceGroupNameAlreadyInUseError(cause?: string): DeviceGroupNameAlreadyInUseError {
  return {
    message: "This device group name is already used",
    cause: cause,
    __brand: "DeviceGroupNameAlreadyInUseError",
  }
}
export type DeviceGroupNotFoundError = Brand<Error, "DeviceGroupNotFoundError">
export function DeviceGroupNotFoundError(cause?: string): DeviceGroupNotFoundError {
  return {
    message: "This device group was not found",
    cause: cause,
    __brand: "DeviceGroupNotFoundError",
  }
}
export type DeviceNotFoundError = Brand<Error, "DeviceNotFoundError">
export function DeviceNotFoundError(cause?: string): DeviceNotFoundError {
  return { message: "This device was not found", cause: cause, __brand: "DeviceNotFoundError" }
}
export type DeviceAlreadyRegisteredError = Brand<Error, "DeviceAlreadyRegisteredError">
export function DeviceAlreadyRegisteredError(cause?: string): DeviceAlreadyRegisteredError {
  return {
    message: "This device is already registered to the system",
    cause: cause,
    __brand: "DeviceAlreadyRegisteredError",
  }
}
export type DeviceUnreachableError = Brand<Error, "DeviceUnreachableError">
export function DeviceUnreachableError(cause?: string): DeviceUnreachableError {
  return {
    message: "This device was not reachable",
    cause: cause,
    __brand: "DeviceUnreachableError",
  }
}
export type NotDeviceEventError = Brand<Error, "NotDeviceEventError">
export function NotDeviceEventError(cause?: string): NotDeviceEventError {
  return {
    message: "The given event is not part of the device events",
    cause: cause,
    __brand: "NotDeviceEventError",
  }
}
export type CommunicationError = Brand<Error, "CommunicationError">
export function CommunicationError(cause?: string): CommunicationError {
  return {
    __brand: "CommunicationError",
    message: "Something went wrong while communicating with a device",
    cause: cause,
  }
}
