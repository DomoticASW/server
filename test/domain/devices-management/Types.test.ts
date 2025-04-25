import { Effect } from "effect"
import { Color, DoubleRange, Enum, IntRange, NoneBoolean, NoneColor, NoneDouble, NoneInt, NoneString, NoneVoid } from "../../../src/domain/devices-management/Types.js"
import { Type } from "../../../src/ports/devices-management/Types.js"

test("Color creation", () => {
    const r = 10
    const g = 122
    const b = 0
    const color = Color(r, g, b)
    expect(color.r).toBe(r)
    expect(color.g).toBe(g)
    expect(color.b).toBe(b)
})

test("Color creation with bad arguments", () => {
    const r = -10
    const g = 290
    const b = 123
    const color = Color(r, g, b)
    expect(color.r).toBe(0)
    expect(color.g).toBe(255)
    expect(color.b).toBe(b)
})

test("Enum TypeConstraints creation", () => {
    const values = new Set(["A", "B", "C"])
    const tc = Enum(values)
    expect(tc.type).toBe(Type.StringType)
    expect(tc.values).toEqual(values)
})

test("Enum validate accepts valid values", async () => {
    const values = ["A", "B", "C"]
    const tc = Enum(new Set(values))
    const operation = Effect.all(values.map(v => tc.validate(v)))
    await Effect.runPromise(operation)
})

test("Enum validate does not accept invalid values", () => {
    const tc = Enum(new Set(["A", "B", "C"]))
    const invalidValues = ["D", "E", "F"]
    const operations = invalidValues.map(v => tc.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { throw new Error("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})

test("IntRange TypeConstraints creation", () => {
    const min = 0
    const max = 100
    const tc = IntRange(min, max)
    expect(tc.type).toBe(Type.IntType)
    expect(tc.min).toEqual(min)
    expect(tc.max).toEqual(max)
})

test("IntRange validate accepts valid values", async () => {
    const tc = IntRange(-10, 100)
    const someValidValues = [-10, 0, 5, 50.0, 100]
    const operation = Effect.all(someValidValues.map(v => tc.validate(v)))
    await Effect.runPromise(operation)
})

test("IntRange validate does not accept invalid values", () => {
    const tc = IntRange(-10, 100)
    const someInvalidValues = [-11, 110, 50.1]
    const operations = someInvalidValues.map(v => tc.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { throw new Error("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})

test("DoubleRange TypeConstraints creation", () => {
    const min = 0.30
    const max = 100
    const tc = DoubleRange(min, max)
    expect(tc.type).toBe(Type.DoubleType)
    expect(tc.min).toEqual(min)
    expect(tc.max).toEqual(max)
})

test("DoubleRange validate accepts valid values", async () => {
    const tc = DoubleRange(-5.5, 100)
    const someValidValues = [-5.5, 0, 5.9, 50.0, 100]
    const operation = Effect.all(someValidValues.map(v => tc.validate(v)))
    await Effect.runPromise(operation)
})

test("DoubleRange validate does not accept invalid values", () => {
    const tc = DoubleRange(-5.5, 100)
    const someInvalidValues = [-11, -5.6, 110]
    const operations = someInvalidValues.map(v => tc.validate(v))
    operations.forEach(op => {
        Effect.match(op, {
            onFailure(error) {
                expect(error.__brand).toBe("InvalidValueError")
            },
            onSuccess() { throw new Error("This operation should have failed") }
        }).pipe(Effect.runSync)
    })
})

test("NoneBoolean TypeConstraints creation", () => {
    const tc = NoneBoolean()
    expect(tc.type).toBe(Type.BooleanType)
    expect(() => tc.validate(true).pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate(false).pipe(Effect.runSync)).not.toThrow()
})

test("NoneInt TypeConstraints creation", () => {
    const tc = NoneInt()
    expect(tc.type).toBe(Type.IntType)
    expect(() => tc.validate(1).pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate(3).pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate(-10).pipe(Effect.runSync)).not.toThrow()
})

test("NoneDouble TypeConstraints creation", () => {
    const tc = NoneDouble()
    expect(tc.type).toBe(Type.DoubleType)
    expect(() => tc.validate(1).pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate(3.10).pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate(-10).pipe(Effect.runSync)).not.toThrow()
})

test("NoneString TypeConstraints creation", () => {
    const tc = NoneString()
    expect(tc.type).toBe(Type.StringType)
    expect(() => tc.validate("hello").pipe(Effect.runSync)).not.toThrow()
    expect(() => tc.validate("world").pipe(Effect.runSync)).not.toThrow()
})

test("NoneColor TypeConstraints creation", () => {
    const tc = NoneColor()
    expect(tc.type).toBe(Type.ColorType)
    expect(() => tc.validate(Color(1, 2, 3)).pipe(Effect.runSync)).not.toThrow()
})

test("NoneVoid TypeConstraints creation", () => {
    const tc = NoneVoid()
    expect(tc.type).toBe(Type.VoidType)
    expect(() => tc.validate().pipe(Effect.runSync)).not.toThrow()
})
