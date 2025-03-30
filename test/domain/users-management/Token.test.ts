import { instanceOf } from "effect/Schema";
import { UserRole } from "../../../src/domain/users-management/Token.js";
import { TokenImpl } from "../../../src/domain/users-management/Token.js";
import { Email } from "../../../src/domain/users-management/User.js";

function createToken(email: Email = Email("ciao@gmail.com"), role: UserRole = UserRole.User) {
  return new TokenImpl(email, role);
}

test("Token creation", () => {
    const token = createToken();
    expect(token.userEmail).toBe("ciao@gmail.com");
    expect(token.role).toBe(UserRole.User);
  })

test("New token generation", () => {
    const token = createToken();
    const newToken = token.newToken(token.userEmail);
    expect(typeof newToken).toBe("string");
})

test("New token generation with empty string", () => {
    const token = createToken();
    expect(() => token.newToken("")).toThrow("Not implemented yet");
})
