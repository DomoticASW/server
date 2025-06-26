import { InvalidValueError, InvalidInputError, DeviceActionError, DeviceNotFoundError, DeviceActionNotFound, DevicePropertyNotFound, DeviceGroupNameAlreadyInUseError, DeviceGroupNotFoundError, DeviceUnreachableError, NotDeviceEventError, DeviceAlreadyRegisteredError, CommunicationError } from "../../../src/ports/devices-management/Errors.js"

test("InvalidValueError construction", () => {
    const cause = "cause"
    const e = InvalidValueError(cause)
    expect(e.__brand).toBe("InvalidValueError")
    expect(e.message).toBe("The given value is not valid")
    expect(e.cause).toBe(cause)
})

test("InvalidInputError construction", () => {
    const cause = "cause"
    const e = InvalidInputError(cause)
    expect(e.__brand).toBe("InvalidInputError")
    expect(e.message).toBe("The given value is not valid a valid input")
    expect(e.cause).toBe(cause)
})

test("DeviceActionError construction", () => {
    const cause = "cause"
    const e = DeviceActionError(cause)
    expect(e.__brand).toBe("DeviceActionError")
    expect(e.message).toBe("Something went wrong while executing this action")
    expect(e.cause).toBe(cause)
})

test("DeviceActionNotFound construction", () => {
    const cause = "cause"
    const e = DeviceActionNotFound(cause)
    expect(e.__brand).toBe("DeviceActionNotFound")
    expect(e.message).toBe("This device action was not found")
    expect(e.cause).toBe(cause)
})

test("DevicePropertyNotFound construction", () => {
    const cause = "cause"
    const e = DevicePropertyNotFound(cause)
    expect(e.__brand).toBe("DevicePropertyNotFound")
    expect(e.message).toBe("This device property was not found")
    expect(e.cause).toBe(cause)
})

test("DeviceGroupNameAlreadyInUseError construction", () => {
    const cause = "cause"
    const e = DeviceGroupNameAlreadyInUseError(cause)
    expect(e.__brand).toBe("DeviceGroupNameAlreadyInUseError")
    expect(e.message).toBe("This device group name is already used")
    expect(e.cause).toBe(cause)
})

test("DeviceGroupNotFoundError construction", () => {
    const cause = "cause"
    const e = DeviceGroupNotFoundError(cause)
    expect(e.__brand).toBe("DeviceGroupNotFoundError")
    expect(e.message).toBe("This device group was not found")
    expect(e.cause).toBe(cause)
})

test("DeviceNotFoundError construction", () => {
    const cause = "cause"
    const e = DeviceNotFoundError(cause)
    expect(e.__brand).toBe("DeviceNotFoundError")
    expect(e.message).toBe("This device was not found")
    expect(e.cause).toBe(cause)
})

test("DeviceAlreadyRegisteredError construction", () => {
    const cause = "cause"
    const e = DeviceAlreadyRegisteredError(cause)
    expect(e.__brand).toBe("DeviceAlreadyRegisteredError")
    expect(e.message).toBe("This device is already registered to the system")
    expect(e.cause).toBe(cause)
})

test("DeviceUnreachableError construction", () => {
    const cause = "cause"
    const e = DeviceUnreachableError(cause)
    expect(e.__brand).toBe("DeviceUnreachableError")
    expect(e.message).toBe("This device was not reachable")
    expect(e.cause).toBe(cause)
})

test("NotDeviceEventError construction", () => {
    const cause = "cause"
    const e = NotDeviceEventError(cause)
    expect(e.__brand).toBe("NotDeviceEventError")
    expect(e.message).toBe("The given event is not part of the device events")
    expect(e.cause).toBe(cause)
})

test("CommunicationError construction", () => {
    const cause = "cause"
    const e = CommunicationError(cause)
    expect(e.__brand).toBe("CommunicationError")
    expect(e.message).toBe("Something went wrong while communicating with a device")
    expect(e.cause).toBe(cause)
})
