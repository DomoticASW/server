import { Role, UserImpl, Email, Nickname, PasswordHash} from "../../../src/domain/users-management/User.js";

test("User creation", () => {
    const user = new UserImpl(Nickname("Ciccio"), Email("ciao@gmail.com"), PasswordHash("passwordHash"), Role.User);
    expect(user.nickname).toBe("Ciccio");
    expect(user.email).toBe("ciao@gmail.com");
    expect(user.passwordHash).toBe("passwordHash");
    expect(user.role).toBe(Role.User);
})

test("Email can be created", () => {
  const email = Email("myEmail@email.com");
  expect(email).toBe("myEmail@email.com");
})
