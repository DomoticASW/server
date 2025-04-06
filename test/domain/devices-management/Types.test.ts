import { Effect } from "effect"
import { DoubleRange, Enum, IntRange } from "../../../src/domain/devices-management/Types.js"
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

test("IntRange TypeConstraints creation", () => {
    const min = 0
    const max = 100
    const ts = IntRange(min, max)
    expect(ts.type).toBe(Type.IntType)
    expect(ts.min).toEqual(min)
    expect(ts.max).toEqual(max)
})

test("IntRange validate accepts valid values", async () => {
    const ts = IntRange(-10, 100)
    const someValidValues = [-10, 0, 5, 50.0, 100]
    const operation = Effect.all(someValidValues.map(v => ts.validate(v)))
    await Effect.runPromise(operation)
})

test("IntRange validate does not accept invalid values", () => {
    const ts = IntRange(-10, 100)
    const someInvalidValues = [-11, 110, 50.1]
    const operations = someInvalidValues.map(v => ts.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { fail("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})

test("DoubleRange TypeConstraints creation", () => {
    const min = 0.30
    const max = 100
    const ts = DoubleRange(min, max)
    expect(ts.type).toBe(Type.IntType)
    expect(ts.min).toEqual(min)
    expect(ts.max).toEqual(max)
})

test("DoubleRange validate accepts valid values", async () => {
    const ts = DoubleRange(-5.5, 100)
    const someValidValues = [-5.5, 0, 5.9, 50.0, 100]
    const operation = Effect.all(someValidValues.map(v => ts.validate(v)))
    await Effect.runPromise(operation)
})

test("DoubleRange validate does not accept invalid values", () => {
    const ts = DoubleRange(-5.5, 100)
    const someInvalidValues = [-11, -5.6, 110]
    const operations = someInvalidValues.map(v => ts.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { fail("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})
