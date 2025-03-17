import { Result } from "option-t/plain_result";
import { User, Nickname, Email, PasswordHash } from "./User.js";
import { Token } from "./Token.js";
import { EmailAlreadyInUseError, UserNotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError } from "./Errors.js";

export interface UsersService {
    publishRegistrationRequest(nickname: Nickname, email: Email, password: PasswordHash): Result<undefined, EmailAlreadyInUseError>;
    approveRegistrationRequest(token: Token, email: Email): Result<undefined, UserNotFoundError | TokenError>;
    rejectRegistrationRequest(token: Token, email: Email): Result<undefined, UserNotFoundError | TokenError>;
    removeUser(token: Token, email: Email): Result<undefined, UserNotFoundError | TokenError>;
    updateUserData(token: Token, nickname?: Nickname, email?: Email, password?: PasswordHash): Result<undefined, UserNotFoundError | EmailAlreadyInUseError | TokenError>;
    getAllUsers(token: Token): Result<Iterable<User>, InvalidTokenError>;
    getUserData(token: Token): Result<User, InvalidTokenError>;
    login(email: Email, password: PasswordHash): Result<Token, InvalidCredentialsError>;
    verifyToken(token: Token): Result<undefined, InvalidTokenError>;
    makeToken(value: string): Result<Token, InvalidTokenFormatError>;
}
