import { Effect } from "effect/Effect"
import {
  Device,
  DeviceActionId,
  DeviceAddress,
  DeviceStatus,
} from "../../domain/devices-management/Device.js"
import { CommunicationError, DeviceActionError, DeviceUnreachableError } from "./Errors.js"

/**
 * Abstraction over many possible implementations of a communication protocol with devices.
 *
 * **Note:**
 *
 * Some methods may fail both with DeviceUnreachableError and CommunicationError.
 * - The first error is used to signal that the server was not able to reach or find a device at the given device address.
 * - While the second error is used to signal any other issues related to communications between the server and devices.
 */
export interface DeviceCommunicationProtocol {
  /**
   * Reaches for a device at the given address and checks whether it is "Online" (reachable and working correctly)
   */
  checkDeviceStatus(deviceAddress: DeviceAddress): Effect<DeviceStatus, CommunicationError>
  /**
   * Reaches for a device at the given address and tells it to execute one of it's actions.
   */
  executeDeviceAction(
    deviceAddress: DeviceAddress,
    deviceActionId: DeviceActionId,
    input: unknown
  ): Effect<void, DeviceUnreachableError | CommunicationError | DeviceActionError>
  /**
   * Reaches for a device at the given address and performs a registration.
   *
   * A registration consists in two things:
   * 1. The device should describe himself to the server (this will result in the produced Device).
   * 2. The device should remember from now on that he is registered to this specific server.
   */
  register(
    deviceAddress: DeviceAddress
  ): Effect<Device, DeviceUnreachableError | CommunicationError>

  /**
   * Reaches for a device at the given address and tells him that he's being unregistered.
   *
   * A device is expected to return a successfull status code if either:
   * - he successfully unregistered
   * - he was already not registered
   */
  unregister(
    deviceAddress: DeviceAddress
  ): Effect<void, DeviceUnreachableError | CommunicationError>
}
