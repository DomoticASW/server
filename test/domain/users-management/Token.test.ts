import { instanceOf } from "effect/Schema";
import { UserRole } from "../../../src/domain/users-management/Token.js";
import { Token } from "../../../src/domain/users-management/Token.js";
import { Email } from "../../../src/domain/users-management/User.js";

function createToken(email: Email = Email("ciao@gmail.com"), role: UserRole = UserRole.User) {
    return Token(email, role);
}

test("Token creation", () => {
    const token = createToken();
    expect(token.userEmail).toBe("ciao@gmail.com");
    expect(token.role).toBe(UserRole.User);
})
