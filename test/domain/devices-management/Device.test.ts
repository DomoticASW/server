import { Effect } from "effect"
import { Device, DeviceEvent, DeviceId, DeviceStatus, DeviceProperty, DeviceAction, DeviceActionId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js"
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

interface MakeDevicePropertyParameters<T> {
    id?: string,
    name?: string,
    value: T,
    setterOrTypeConstraints: DeviceAction<T> | TypeConstraints<T>
}
function makeDeviceProperty<T>({
    id = "1",
    name = "brightness",
    value,
    setterOrTypeConstraints
}: MakeDevicePropertyParameters<T>) {
    return DeviceProperty(DevicePropertyId(id), name, value, setterOrTypeConstraints)
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
    const id = "1"
    const name = "Lamp"
    const address = "https://192.168.0.2:8080"
    const status = DeviceStatus.Online
    const actions = [makeDeviceAction({ name: "set brightness", inputTypeConstraints: IntRange(0, 100) })]
    const properties = [makeDeviceProperty({ name: "brightness", value: 50, setterOrTypeConstraints: actions[0] })]
    const events = [DeviceEvent("low battery"), DeviceEvent("full battery")]
    const d = makeDevice({ id, name, address, status, properties, actions, events })
    expect(d.id).toBe(id)
    expect(d.name).toBe(name)
    expect(d.address).toEqual(new URL(address))
    expect(d.status).toBe(status)
    expect(d.properties).toEqual(properties)
    expect(d.actions).toEqual(actions)
    expect(d.events).toEqual(events)
})

test("DeviceProperty creation", () => {
    const id = "1"
    const name = "brightness"
    const value = 3
    const typeConstraint = IntRange(0, 100)
    const property = makeDeviceProperty({ id: id, name: name, value: value, setterOrTypeConstraints: typeConstraint })
    expect(property.id).toBe(id)
    expect(property.name).toBe(name)
    expect(property.value).toBe(value)
    expect(property.setter).toBeUndefined()
    expect(property.typeConstraints).toBe(typeConstraint)
})

test("DeviceProperty with setter creation", () => {
    const typeConstraint = IntRange(0, 100)
    const action = makeDeviceAction({ inputTypeConstraints: typeConstraint })
    const property = makeDeviceProperty({ value: 3, setterOrTypeConstraints: action })
    expect(property.setter).toBe(action)
    expect(property.typeConstraints).toBe(typeConstraint)
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
