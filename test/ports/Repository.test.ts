import { DuplicateIdError } from "../../src/ports/Repository.js";

test("DuplicateIdError has a message", () => {
    const error = DuplicateIdError();
    expect(error.message).toBe("Id already in use")
    expect(error.cause).toBeUndefined()
});

test("DuplicateIdError has a cause", () => {
    const error = DuplicateIdError("This is the cause");
    expect(error.cause).toBe("This is the cause")
});

test("DuplicateIdError has a brand", () => {
    const error = DuplicateIdError();
    expect(error.__brand).toBe("DuplicateIdError");
});