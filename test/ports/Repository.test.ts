import { DuplicateIdError, NotFoundError } from "../../src/ports/Repository.js"

test("DuplicateIdError cause add correcly", () => {
  const cause = "Device id already taken"
  const err = DuplicateIdError(cause)
  expect(err.cause).toBe(cause)
})

test("NotFoundError cause add correcly", () => {
  const cause = "Device not found"
  const err = NotFoundError(cause)
  expect(err.cause).toBe(cause)
})

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

test("NotFoundError has a message", () => {
    const error = NotFoundError();
    expect(error.message).toBe("Not found")
    expect(error.cause).toBeUndefined()
});

test("NotFoundError has a cause", () => {
    const error = NotFoundError("This is the cause");
    expect(error.cause).toBe("This is the cause")
});

test("NotFoundError has a brand", () => {
    const error = NotFoundError();
    expect(error.__brand).toBe("NotFoundError");
});
