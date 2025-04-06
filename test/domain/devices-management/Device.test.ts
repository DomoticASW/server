import { Effect } from "effect"
import { Device, DeviceEvent, DeviceId, DeviceStatus, DeviceProperty, DeviceAction, DeviceActionId } from "../../../src/domain/devices-management/Device.js"
import { Enum, IntRange, NoneVoid, TypeConstraints } from "../../../src/domain/devices-management/Types.js"

interface MakeDeviceParameters {
    id?: string,
    name?: string,
    address?: string,
    status?: DeviceStatus,
    properties?: DeviceProperty<unknown>[],
    actions?: DeviceAction<unknown>[],
    events?: DeviceEvent[],
}
function makeDevice({
    id = "1",
    name = "Lamp",
    address = "https://192.168.0.2:8080",
    status = DeviceStatus.Online,
    properties = [],
    actions = [],
    events = []
}: MakeDeviceParameters) {
    return Device(DeviceId(id), name, new URL(address), status, properties, actions, events)
}

interface MakeDeviceActionParameters<T> {
    id?: string,
    name?: string,
    description?: string,
    inputTypeConstraints: TypeConstraints<T>
}
function makeDeviceAction<T>({
    id = "1",
    name = "turn on",
    description = "turns the lamp on",
    inputTypeConstraints
}: MakeDeviceActionParameters<T>) {
    return DeviceAction(DeviceActionId(id), name, inputTypeConstraints, description)
}

test("DeviceId creation", () => {
    const idValue = "1"
    const id = DeviceId(idValue)
    expect(id).toBe(idValue)
})

test("Device creation", () => {
    const id = DeviceId("1")
    const name = "Lamp"
    const address = new URL("https://192.168.0.2:8080")
    const status = DeviceStatus.Online
    const events = [DeviceEvent("low battery"), DeviceEvent("full battery")]
    const d = Device(id, name, address, status, [], [], events)
    expect(d.id).toBe(id)
    expect(d.name).toBe(name)
    expect(d.address).toBe(address)
    expect(d.status).toBe(status)
    expect(d.properties).toEqual([])
    expect(d.actions).toEqual([])
    expect(d.events).toEqual(events)
})

test("DeviceAction creation", () => {
    const id = "1"
    const name = "turn on"
    const description = "turns the lamp on"
    const inputTC = NoneVoid()
    const action = makeDeviceAction({ id: id, name: name, description: description, inputTypeConstraints: inputTC })
    expect(action.id).toBe(id)
    expect(action.name).toBe(name)
    expect(action.description).toBe(description)
    expect(action.inputTypeConstraints).toBe(inputTC)
})

test("DeviceAction execution checks input type constraints", () => {
    const action = makeDeviceAction({ inputTypeConstraints: IntRange(0, 100) })
    expect(() => action.execute(3).pipe(Effect.runSync)).not.toThrow()
    action.execute(110).pipe(
        Effect.match({
            onFailure: (error) => expect(error.__brand).toBe("InvalidInputError"),
            onSuccess() { throw new Error("This operation should not have succeded") }
        }),
        Effect.runSync
    )

    const action2 = makeDeviceAction({ inputTypeConstraints: Enum(new Set(["A", "B", "C"])) })
    expect(() => action2.execute("A").pipe(Effect.runSync)).not.toThrow()
    action2.execute("D").pipe(
        Effect.match({
            onFailure: (error) => expect(error.__brand).toBe("InvalidInputError"),
            onSuccess() { throw new Error("This operation should not have succeded") }
        }),
        Effect.runSync
    )
})

test("DeviceEvent creation", () => {
    const name = "washing done"
    const event = DeviceEvent(name)
    expect(event.name).toBe(name)
})
