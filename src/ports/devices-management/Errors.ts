import { Brand } from "../../utils/Brand.js"
import { Error } from "../Error.js"

export type InvalidValueError = Brand<Error, "InvalidValueError">
export type InvalidInputError = Brand<Error, "InvalidInputError">
export type DeviceNotFound = Brand<Error, "DeviceNotFound">
export type DeviceActionError = Brand<Error, "DeviceActionError">
export type DeviceActionNotFound = Brand<Error, "DeviceActionNotFound">
export type DevicePropertyNotFound = Brand<Error, "DevicePropertyNotFound">
export type DeviceGroupNameAlreadyInUseError = Brand<Error, "DeviceGroupNameAlreadyInUseError">
export type DeviceGroupNotFoundError = Brand<Error, "DeviceGroupNotFoundError">
export type DeviceNotFoundError = Brand<Error, "DeviceNotFoundError">
export type DeviceUnreachableError = Brand<Error, "DeviceUnreachableError">
export type NotDeviceEventError = Brand<Error, "NotDeviceEventError">
