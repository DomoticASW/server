import { Effect, succeed, fail, tryPromise, flatMap, timeout, bind, catchIf, Do, all, if as if_ } from "effect/Effect";
import { DeviceCommunicationProtocol } from "../../ports/devices-management/DeviceCommunicationProtocol.js";
import { CommunicationError, DeviceUnreachableError, DeviceActionError } from "../../ports/devices-management/Errors.js";
import { Device, DeviceAction, DeviceActionId, DeviceAddress, DeviceEvent, DeviceId, DeviceProperty, DevicePropertyId, DeviceStatus } from "../../domain/devices-management/Device.js";
import { pipe } from "effect";
import { millis } from "effect/Duration";
import { TimeoutException } from "effect/Cause";
import { DoubleRange, Enum, IntRange, NoneBoolean, NoneColor, NoneDouble, NoneInt, NoneString, NoneVoid, TypeConstraints } from "../../domain/devices-management/Types.js";

export class DeviceCommunicationProtocolHttpAdapter implements DeviceCommunicationProtocol {

  /**
   * @param serverPort The port on which devices are able to reach the server.
   * @param timeoutToReachDeviceMs The amount of time after which a non responding device is considered unreachable
   */
  constructor(readonly serverPort: number, readonly timeoutToReachDeviceMs: number = 5000) { }

  checkDeviceStatus(deviceAddress: DeviceAddress): Effect<DeviceStatus, CommunicationError> {
    const { host, port } = deviceAddress
    return Do.pipe(
      bind("response", () => tryPromise({
        try: () => fetch(`http://${host}:${port}/check-status`, { method: "GET" }),
        catch: (e) => CommunicationError((e as Error).message)
      })),
      timeout(millis(this.timeoutToReachDeviceMs)),
      flatMap(({ response }) =>
        if_(response.ok, {
          onTrue: () => succeed(DeviceStatus.Online),
          onFalse: () => Do.pipe(
            bind("body", () => tryPromise({
              try: () => response.json(),
              catch: (e) => CommunicationError((e as Error).message)
            })),
            flatMap(({ body }) => fail(CommunicationError("While checking if device is online it responded but with an error\n" + body)))
          )
        })
      ),
      catchIf(e => e instanceof TimeoutException, () => succeed(DeviceStatus.Offline))
    );
  }

  executeDeviceAction(deviceAddress: DeviceAddress, deviceActionId: DeviceActionId, input: unknown): Effect<void, DeviceUnreachableError | CommunicationError | DeviceActionError> {
    const { host, port } = deviceAddress
    return Do.pipe(
      bind("response", () => tryPromise({
        try: () => fetch(`http://${host}:${port}/execute/${deviceActionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input })
        }),
        catch: (e) => CommunicationError((e as Error).message)
      })),
      timeout(millis(this.timeoutToReachDeviceMs)),
      catchIf(e => e instanceof TimeoutException, () => fail(DeviceUnreachableError())),
      bind("_", ({ response }) =>
        if_(response.ok, {
          onTrue: () => succeed(null),
          onFalse: () => Do.pipe(
            bind("body", () => tryPromise({
              try: () => response.json(),
              catch: (e) => CommunicationError((e as Error).message)
            })),
            flatMap(({ body }) => fail(DeviceActionError(body)))
          )
        })
      )
    );
  }

  /**
   * 
   * **An example of expected device response**:
   * ```json
   * {
   *  "id": "128012392139102821",
   *  "name": "Roomba",
   *  "properties": [
   *    {
   *      "id": "battery",
   *      "name": "Battery",
   *      "value": 50,
   *      "typeConstraints": {
   *        "constraint": "IntRange",
   *        "min": 0,
   *        "max": 100
   *      }
   *    },
   *    {
   *      "id": "state",
   *      "name": "State",
   *      "value": "Cleaning",
   *      "typeConstraints": {
   *        "constraint": "Enum",
   *        "values": ["Charging", "Cleaning", "Going charging"]
   *      }
   *    },
   *    {
   *      "id": "mode",
   *      "name": "Mode",
   *      "value": "Silent",
   *      "setterActionId": "setMode"
   *    },
   *    {
   *      "id": "currentRoom",
   *      "name": "Current room",
   *      "value": "Bathroom",
   *      "typeConstraints": {
   *        "type": "String",
   *        "constraint": "None"
   *      }
   *    },
   *  ],
   *  "actions": [
   *    {
   *      "id": "start",
   *      "name": "Start",
   *      "description": "The roomba will start cleaning",
   *      "inputTypeConstraints": {
   *        "type": "Void",
   *        "constraint": "None"
   *      }
   *    },
   *    {
   *      "id": "stop",
   *      "name": "Stop",
   *      "description": "The roomba will stop cleaning and return to its charging station",
   *      "inputTypeConstraints": {
   *        "type": "Void",
   *        "constraint": "None"
   *      }
   *    },
   *    {
   *      "id": "setMode",
   *      "name": "Set mode",
   *      "description": null,
   *      "inputTypeConstraints": {
   *        "constraint": "Enum",
   *        "values": ["Silent", "DeepCleaning", "Performance"]
   *      }
   *    }
   *  ]
   *  "events": ["started", "stopped", "low-battery"]
   * }
   * ```
   * @inheritdoc
   */
  register(deviceAddress: DeviceAddress): Effect<Device, DeviceUnreachableError | CommunicationError> {
    const { host, port } = deviceAddress
    return Do.pipe(
      bind("response", () => tryPromise({
        try: () => fetch(`http://${host}:${port}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverPort: this.serverPort })
        }),
        catch: (e) => CommunicationError((e as Error).message)
      })),
      timeout(millis(this.timeoutToReachDeviceMs)),
      catchIf(e => e instanceof TimeoutException, () => fail(DeviceUnreachableError())),
      bind("body", ({ response }) => tryPromise({
        try: () => response.json(),
        catch: (e) => CommunicationError((e as Error).message)
      })),
      bind("_", ({ response, body }) => response.ok ? succeed(null) : fail(CommunicationError(body))),
      bind("d", ({ body }) => isDeviceRegistration(body) ? succeed(body) : fail(CommunicationError("Received device description format was wrong"))),
      flatMap(({ d }) => {
        const actions = d.actions.map(a => DeviceAction(DeviceActionId(a.id), a.name, decodeTypeConstraint(a.inputTypeConstraints), a.description))
        const events = d.events.map(e => DeviceEvent(e))
        const properties = d.properties.map(p => {
          if (isDevicePropertyWithSetterRegistration(p)) {
            const action = actions.find(a => a.id == p.setterActionId)
            if (action) {
              return succeed(DeviceProperty(DevicePropertyId(p.id), p.name, p.value, action))
            } else {
              return fail(CommunicationError("Received device description where property ${p.name} declares setter ${p.setterOrTypeConstraint} which is missing in the actions"))
            }
          } else if (isDevicePropertyWithTypeConstraintsRegistration(p)) {
            return succeed(DeviceProperty(DevicePropertyId(p.id), p.name, p.value, decodeTypeConstraint(p.typeConstraints)))
          } else {
            return fail(CommunicationError("Unable to decode device property setter or type constraints"))
          }
        })
        return pipe(
          all(properties),
          flatMap((properties) => succeed(Device(DeviceId(d.id), d.name, deviceAddress, DeviceStatus.Online, properties, actions, events)))
        )
      })
    )
  };
}
function isDeviceRegistration(o: unknown): o is DeviceRegistration {
  return o != null && typeof o == "object" &&
    "id" in o && typeof o.id == "string" &&
    "name" in o && typeof o.name == "string" &&
    "properties" in o && Array.isArray(o.properties) && reduceOrDefault(o.properties.map(p => isDevicePropertyRegistration(p)), ((a, b) => a && b), true) &&
    "actions" in o && Array.isArray(o.actions) && reduceOrDefault(o.actions.map(a => isDeviceActionRegistration(a)), ((a, b) => a && b), true) &&
    "events" in o && Array.isArray(o.events) && reduceOrDefault(o.events.map(e => typeof e == "string"), ((a, b) => a && b), true)
}
function isDevicePropertyRegistration(o: unknown): o is DevicePropertyRegistration {
  return o != null && typeof o == "object" &&
    "id" in o && typeof o.id == "string" &&
    "name" in o && typeof o.name == "string" &&
    "value" in o &&
    (("setterActionId" in o && typeof o.setterActionId == "string") || ("typeConstraints" in o && isTypeConstraintsRegistration(o.typeConstraints)))
}
function isDevicePropertyWithSetterRegistration(o: unknown): o is DevicePropertyWithSetterRegistration {
  return isDevicePropertyRegistration(o) &&
    "setterActionId" in o && typeof o.setterActionId == "string"
}
function isDevicePropertyWithTypeConstraintsRegistration(o: unknown): o is DevicePropertyWithTypeConstraintsRegistration {
  return isDevicePropertyRegistration(o) &&
    "typeConstraints" in o && isTypeConstraintsRegistration(o.typeConstraints)
}
function isDeviceActionRegistration(o: unknown): o is DeviceActionRegistration {
  return o != null && typeof o == "object" &&
    "id" in o && typeof o.id == "string" &&
    "name" in o && typeof o.name == "string" &&
    (!("description" in o) || typeof o.description == "string") &&
    "inputTypeConstraints" in o && isTypeConstraintsRegistration(o.inputTypeConstraints)
}
function isTypeConstraintsRegistration(o: unknown): o is TypeConstraintsRegistration {
  return isEnumTypeConstraint(o) || isIntRangeTypeConstraint(o) || isDoubleRangeTypeConstraint(o) || isNoneTypeConstraint(o)
}

function isEnumTypeConstraint(o: unknown): o is EnumRegistration {
  return o != null && typeof o == "object" &&
    "constraint" in o && typeof o.constraint == "string" && o.constraint == "Enum" &&
    "values" in o && Array.isArray(o.values) && reduceOrDefault(o.values.map(v => typeof v == "string"), ((a, b) => a && b), true)
}

function isIntRangeTypeConstraint(o: unknown): o is IntRangeRegistration {
  return o != null && typeof o == "object" &&
    "constraint" in o && typeof o.constraint == "string" && o.constraint == "IntRange" &&
    "min" in o && Number.isInteger(o.min) &&
    "max" in o && Number.isInteger(o.max)
}
function isDoubleRangeTypeConstraint(o: unknown): o is DoubleRangeRegistration {
  return o != null && typeof o == "object" &&
    "constraint" in o && typeof o.constraint == "string" && o.constraint == "DoubleRange" &&
    "min" in o && typeof o.min == "number" &&
    "max" in o && typeof o.max == "number"
}
function isNoneTypeConstraint(o: unknown): o is NoneRegistration {
  return o != null && typeof o == "object" &&
    "constraint" in o && typeof o.constraint == "string" && o.constraint == "None" &&
    "type" in o && typeof o.type == "string" && ["String", "Int", "Double", "Boolean", "Color", "Void"].indexOf(o.type) != -1
}

function reduceOrDefault<T>(array: Array<T>, reducer: (a: T, b: T) => T, def: T) {
  return array.length == 0 ? def : array.reduce(reducer)
}

function decodeTypeConstraint(tc: TypeConstraintsRegistration): TypeConstraints<unknown> {
  if (isEnumTypeConstraint(tc)) {
    return Enum(new Set(tc.values))
  } else if (isIntRangeTypeConstraint(tc)) {
    return IntRange(tc.min, tc.max)
  } else if (isDoubleRangeTypeConstraint(tc)) {
    return DoubleRange(tc.min, tc.max)
  } else if (isNoneTypeConstraint(tc)) {
    switch (tc.type) {
      case "String": return NoneString()
      case "Int": return NoneInt()
      case "Double": return NoneDouble()
      case "Boolean": return NoneBoolean()
      case "Color": return NoneColor()
      case "Void": return NoneVoid()
    }
  }
  throw new Error("A new type of type constraint was added and the decode function was not updated")
}


interface DeviceRegistration {
  id: string
  name: string
  properties: [DevicePropertyRegistration]
  actions: [DeviceActionRegistration]
  events: [string]
}

type TypeConstraintsRegistration = EnumRegistration | IntRangeRegistration | DoubleRangeRegistration | NoneRegistration

class EnumRegistration {
  constraint = "Enum" as const
  constructor(public values: [string]) { }
}
class IntRangeRegistration {
  constraint = "IntRange" as const
  constructor(public min: number, public max: number) { }
}
class DoubleRangeRegistration {
  constraint = "DoubleRange" as const
  constructor(public min: number, public max: number) { }
}
class NoneRegistration {
  constraint = "None" as const
  constructor(public type: "String" | "Int" | "Double" | "Boolean" | "Color" | "Void") { }
}

interface DevicePropertyRegistration {
  id: string
  name: string
  value: unknown
}
interface DevicePropertyWithSetterRegistration extends DevicePropertyRegistration {
  setterActionId: string
}
interface DevicePropertyWithTypeConstraintsRegistration extends DevicePropertyRegistration {
  typeConstraints: TypeConstraintsRegistration
}

interface DeviceActionRegistration {
  id: string
  name: string
  description: string | undefined
  inputTypeConstraints: TypeConstraintsRegistration
}
