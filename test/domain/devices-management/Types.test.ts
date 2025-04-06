import { Effect } from "effect"
import { Enum } from "../../../src/domain/devices-management/Types.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("Enum TypeConstraints creation", () => {
    const values = new Set(["A", "B", "C"])
    const ts = Enum(values)
    expect(ts.type).toBe(Type.StringType)
    expect(ts.values).toEqual(values)
})

test("Enum validate accepts valid values", async () => {
    const values = ["A", "B", "C"]
    const ts = Enum(new Set(values))
    const operation = Effect.all(values.map(v => ts.validate(v)))
    await Effect.runPromise(operation)
})

test("Enum validate does not accept invalid values", () => {
    const ts = Enum(new Set(["A", "B", "C"]))
    const invalidValues = ["D", "E", "F"]
    const operations = invalidValues.map(v => ts.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { fail("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})
