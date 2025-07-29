import { Effect } from "effect/Effect";
import { User, Nickname, Email, ClearTextPassword } from "../../domain/users-management/User.js";
import { Token } from "../../domain/users-management/Token.js";
import { EmailAlreadyInUseError, UserNotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError, RegistrationRequestNotFoundError } from "./Errors.js";
import { RegistrationRequest } from "../../domain/users-management/RegistrationRequest.js";

export interface UsersService {
    getAllRegistrationRequests(token: Token): Effect<Iterable<RegistrationRequest>, InvalidTokenError>;
    publishRegistrationRequest(nickname: Nickname, email: Email, password: ClearTextPassword): Effect<void, EmailAlreadyInUseError>;
    approveRegistrationRequest(token: Token, email: Email): Effect<void, EmailAlreadyInUseError | RegistrationRequestNotFoundError | TokenError>;
    rejectRegistrationRequest(token: Token, email: Email): Effect<void, RegistrationRequestNotFoundError | TokenError>;
    removeUser(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    updateUserData(token: Token, nickname?: Nickname, password?: ClearTextPassword): Effect<void, UserNotFoundError | TokenError>;
    getAllUsers(token: Token): Effect<Iterable<User>, InvalidTokenError>;
    getUserData(token: Token): Effect<User, InvalidTokenError | UserNotFoundError>;
    getUserDataUnsafe(email: Email): Effect<User, UserNotFoundError>;
    login(email: Email, password: ClearTextPassword): Effect<Token, InvalidCredentialsError>;
    verifyToken(token: Token): Effect<void, InvalidTokenError>;
    makeToken(value: string): Effect<Token, InvalidTokenFormatError>;
}
