import { Effect, pipe } from "effect"
import { DeviceId, DeviceActionId, DeviceAddress, Device, DeviceAction, DeviceStatus } from "../../../src/domain/devices-management/Device.js"
import { IntRange } from "../../../src/domain/devices-management/Types.js"
import { Token } from "../../../src/domain/users-management/Token.js"
import { Email, Role } from "../../../src/domain/users-management/User.js"
import { DeviceActionNotFound, DeviceNotFoundError } from "../../../src/ports/devices-management/Errors.js"
import { PermissionError } from "../../../src/ports/permissions-management/Errors.js"
import { PermissionsService } from "../../../src/ports/permissions-management/PermissionsService.js"
import { DeviceCommunicationProtocol } from "../../../src/ports/devices-management/DeviceCommunicationProtocol.js"
import { DeviceActionsService } from "../../../src/ports/devices-management/DeviceActionsService.js"
import { InvalidTokenError } from "../../../src/ports/users-management/Errors.js"
import { UsersService } from "../../../src/ports/users-management/UsersService.js"
import { DeviceActionsServiceImpl } from "../../../src/domain/devices-management/DeviceActionsServiceImpl.js"
import { DevicesService } from "../../../src/ports/devices-management/DevicesService.js"

let service: DeviceActionsService
const deviceId = DeviceId("1")
const actionId = DeviceActionId("1")
let receivedInput: unknown
const devicesService: DevicesService = {
    findUnsafe(dId: DeviceId) {
        if (dId != deviceId) { return Effect.fail(DeviceNotFoundError()) }

        const action = DeviceAction(actionId, "action", IntRange(0, 100))
        const d = Device(deviceId, "device", DeviceAddress("localhost", 8080), DeviceStatus.Online, [], [action], [])
        return Effect.succeed({
            id: d.id,
            name: d.name,
            address: d.address,
            status: d.status,
            properties: d.properties,
            actions: d.actions,
            events: d.events,
            executeAction(aId: DeviceActionId, input: unknown, comm: DeviceCommunicationProtocol) {
                if (aId != actionId) { return Effect.fail(DeviceActionNotFound()) }
                receivedInput = input
                return d.executeAction(actionId, input, comm)
            },
        })
    },
} as unknown as DevicesService
const alwaysValidTokenUsersService = {
    verifyToken() {
        return Effect.succeed(null)
    }
} as unknown as UsersService
const deviceCommunicationProtocol: DeviceCommunicationProtocol = {
    executeDeviceAction: () => Effect.succeed(undefined),
} as unknown as DeviceCommunicationProtocol
const freePermissionsService = {
    canExecuteActionOnDevice() {
        return Effect.succeed(null)
    }
} as unknown as PermissionsService

function makeToken(role: Role = Role.Admin): Token {
    return {
        userEmail: Email("ciccio.pasticcio@email.com"),
        role: role,
        source: "test",
    }
}

beforeEach(() => {
    service = new DeviceActionsServiceImpl(devicesService, alwaysValidTokenUsersService, freePermissionsService, deviceCommunicationProtocol)
})
describe("executeAction", () => {
    const userWithoutPermissionEmail = Email("sventurato@email.com")
    beforeEach(() => {
        const permissionsService: PermissionsService = {
            canExecuteActionOnDevice(token: Token) {
                if (token.userEmail !== userWithoutPermissionEmail) return Effect.succeed(null)
                else return Effect.fail(PermissionError())
            }
        } as unknown as PermissionsService
        service = new DeviceActionsServiceImpl(devicesService, alwaysValidTokenUsersService, permissionsService, deviceCommunicationProtocol)
    })

    test("executes the given action on the given device with the given input", () => {
        const input = 4
        pipe(
            Effect.gen(function* () {
                yield* service.executeAction(makeToken(), deviceId, actionId, input)
                expect(receivedInput).toEqual(input)
            }),
            Effect.runSync
        )
    })

    test("throws if the action is not found on the device", () => {
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.executeAction(makeToken(), deviceId, DeviceActionId("nope"), 5)
            }),
            Effect.runSync
        )).toThrow("DeviceActionNotFound")
    })

    test("throws if the user executing the action has no permission to do so", () => {
        const token: Token = {
            userEmail: userWithoutPermissionEmail,
            role: Role.Admin,
            source: "test",
        }
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.executeAction(token, deviceId, actionId, 5)
            }),
            Effect.runSync
        )).toThrow("PermissionError")
    })
})

describe("executeAutomationAction", () => {

    test("executes the given action on the given device with the given input", () => {
        const input = 4
        pipe(
            Effect.gen(function* () {
                yield* service.executeAutomationAction(deviceId, actionId, input)
                expect(receivedInput).toEqual(input)
            }),
            Effect.runSync
        )
    })

    test("throws if the action is not found on the device", () => {
        expect(() => pipe(
            Effect.gen(function* () {
                yield* service.executeAutomationAction(deviceId, DeviceActionId("nope"), 5)
            }),
            Effect.runSync
        )).toThrow("DeviceActionNotFound")
    })
})

describe("all methods requiring a token fail if the token is invalid", () => {
    const token = makeToken()
    const allMethods: Array<(s: DeviceActionsService) => Effect.Effect<unknown, unknown>> = [
        (s) => s.executeAction(token, deviceId, actionId, undefined),
    ]

    beforeEach(() => {
        const alwaysInvalidTokenUsersService = {
            verifyToken(): Effect.Effect<void, InvalidTokenError> {
                return Effect.fail({ __brand: "InvalidTokenError", message: "" })
            }
        } as unknown as UsersService
        service = new DeviceActionsServiceImpl(devicesService, alwaysInvalidTokenUsersService, freePermissionsService, deviceCommunicationProtocol)
    })

    allMethods.forEach(m => {
        test(m.toString(), async () => {
            await expect(() => pipe(
                m(service),
                Effect.runPromise
            )).rejects.toThrow("InvalidTokenError")
        })
    })
})