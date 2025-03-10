import { User, Nickname, Email, PasswordHash } from "./User.js";
import { Token } from "./Token.js";
import { EmailAlreadyInUseError, NotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError } from "./Errors.js";

export interface UsersService {
    publishRegistrationRequest(nickname: Nickname, email: Email, password: PasswordHash): EmailAlreadyInUseError | undefined;
    approveRegistrationRequest(Token: Token, Email: Email): NotFoundError | TokenError | undefined;
    rejectRegistrationRequest(Token: Token, Email: Email): NotFoundError | TokenError | undefined;
    removeUser(Token: Token, Email: Email): NotFoundError | TokenError | undefined;
    updateUserData(Token: Token, Nickname?: Nickname, Email?: Email, Password?: PasswordHash): NotFoundError | EmailAlreadyInUseError | TokenError | undefined;
    getAllUsers(Token: Token): Iterable<User> | InvalidTokenError;
    getUserData(Token: Token): User | InvalidTokenError;
    login(Email: Email, Password: PasswordHash): Token | InvalidCredentialsError;
    verifyToken(Token: Token): InvalidTokenError | undefined;
    makeToken(value: string): Token | InvalidTokenFormatError;
}
