import { Email } from "../../../src/domain/users-management/User.js"

test("Email can be created", () => {
  const email = Email("myEmail@email.com");
  expect(email).toBe("myEmail@email.com");
})