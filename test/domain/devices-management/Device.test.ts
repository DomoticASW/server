import { Effect } from "effect"
import { Device, DeviceEvent, DeviceId, DeviceStatus, DeviceProperty, DeviceAction, DeviceActionId, DevicePropertyId } from "../../../src/domain/devices-management/Device.js"
import { Enum, IntRange, NoneBoolean, NoneColor, NoneDouble, NoneInt, NoneString, NoneVoid, TypeConstraints } from "../../../src/domain/devices-management/Types.js"
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js"
import { CommunicationError } from "../../../src/ports/devices-management/Errors.js"

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

let communicationProtocol: DeviceCommunicationProtocolSpy
class DeviceCommunicationProtocolSpy implements DeviceCommunicationProtocol {
    callsToExecuteDeviceAction: number = 0
    deviceAddress?: URL
    deviceActionId?: DeviceActionId
    input?: unknown
    executeDeviceAction(deviceAddress: URL, deviceActionId: DeviceActionId, input: unknown) {
        this.deviceAddress = deviceAddress
        this.deviceActionId = deviceActionId
        this.input = input
        this.callsToExecuteDeviceAction += 1
        return Effect.void
    }
    checkDeviceStatus(): Effect.Effect<DeviceStatus, CommunicationError> {
        throw new Error("Unimplemented")
    }
}

beforeEach(() => {
    communicationProtocol = new DeviceCommunicationProtocolSpy()
})

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

test("Device execute action actually executes the device action", () => {
    const action = makeDeviceAction({ id: "1", inputTypeConstraints: NoneInt() })
    const d = makeDevice({ actions: [action] })
    const input = 60
    Effect.runSync(d.executeAction(action.id, input, communicationProtocol))

    expect(communicationProtocol.callsToExecuteDeviceAction).toEqual(1)
    expect(communicationProtocol.deviceAddress).toEqual(d.address)
    expect(communicationProtocol.deviceActionId).toEqual(action.id)
    expect(communicationProtocol.input).toEqual(input)
})

test("Device executeAction checks input type constraints", () => {
    const action1 = makeDeviceAction({ id: "1", inputTypeConstraints: IntRange(0, 100) })
    const action2 = makeDeviceAction({ id: "2", inputTypeConstraints: Enum(new Set(["A", "B", "C"])) })
    const d = makeDevice({ actions: [action1, action2] })
    expect(() => d.executeAction(action1.id, 3, communicationProtocol).pipe(Effect.runSync)).not.toThrow()
    expect(() => d.executeAction(action1.id, 110, communicationProtocol).pipe(Effect.runSync)).toThrow("InvalidInputError")
    expect(() => d.executeAction(action2.id, "A", communicationProtocol).pipe(Effect.runSync)).not.toThrow()
    expect(() => d.executeAction(action2.id, "D", communicationProtocol).pipe(Effect.runSync)).toThrow("InvalidInputError")
})

test("Device execute action missing action", () => {
    const actions = [makeDeviceAction({ name: "set brightness", inputTypeConstraints: IntRange(0, 100) })]
    const properties = [makeDeviceProperty({ name: "brightness", value: 50, setterOrTypeConstraints: actions[0] })]
    const d = makeDevice({ properties, actions })
    d.executeAction(DeviceActionId("wrongid"), 60, communicationProtocol).pipe(
        Effect.match({
            onFailure: (error) => expect(error.__brand).toBe("DeviceActionNotFound"),
            onSuccess() { throw new Error("This operation should not have succeded") }
        }),
        Effect.runSync
    )
})

test("Device execute action checks input type constraints", () => {
    const actions = [makeDeviceAction({ name: "set brightness", inputTypeConstraints: IntRange(0, 100) })]
    const properties = [makeDeviceProperty({ name: "brightness", value: 50, setterOrTypeConstraints: actions[0] })]
    const d = makeDevice({ properties, actions })
    d.executeAction(actions[0].id, 101, communicationProtocol).pipe(
        Effect.match({
            onFailure: (error) => expect(error.__brand).toBe("InvalidInputError"),
            onSuccess() { throw new Error("This operation should not have succeded") }
        }),
        Effect.runSync
    )
    expect(() => d.executeAction(actions[0].id, 60, communicationProtocol).pipe(Effect.runSync)).not.toThrow()
})

test("Device execute action checks input type", () => {
    const testSet: Array<{ constraints: TypeConstraints<unknown>, input: unknown }> = [
        { constraints: NoneBoolean(), input: "hello" },
        { constraints: NoneInt(), input: "hello" },
        { constraints: NoneDouble(), input: "hello" },
        { constraints: NoneString(), input: true },
        { constraints: NoneColor(), input: { color: "red" } },
        { constraints: NoneVoid(), input: "hello" },
    ]

    testSet.forEach(({ constraints, input }) => {
        const actions = [makeDeviceAction({ inputTypeConstraints: constraints })]
        const d = makeDevice({ actions })
        d.executeAction(actions[0].id, input, communicationProtocol).pipe(
            Effect.match({
                onFailure: (error) => expect(error.__brand).toBe("InvalidInputError"),
                onSuccess() { throw new Error(`This operation should not have succeded. Input type: ${constraints.type}, input: ${input}`) }
            }),
            Effect.runSync
        )
    })
})

test("Device execute action maps CommunicationErrors into DeviceActionErrors", () => {
    const action = makeDeviceAction({ id: "1", inputTypeConstraints: NoneInt() })
    const d = makeDevice({ actions: [action] })
    communicationProtocol = {
        executeDeviceAction: () => Effect.fail(CommunicationError())
    } as unknown as DeviceCommunicationProtocolSpy
    expect(() => d.executeAction(action.id, 10, communicationProtocol).pipe(Effect.runSync)).toThrow("DeviceActionError")
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

test("DeviceEvent creation", () => {
    const name = "washing done"
    const event = DeviceEvent(name)
    expect(event.name).toBe(name)
})
