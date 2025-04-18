import { Effect } from "effect/Effect";
import { User, Nickname, Email, PasswordHash, Role, UserImpl } from "../../domain/users-management/User.js";
import { Token } from "../../domain/users-management/Token.js";
import { EmailAlreadyInUseError, UserNotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError, } from "./Errors.js";
import { UserRepository } from "./UserRepository.js";
import { Effect as Eff } from "effect";
import { pipe } from "effect";
import jwt from 'jsonwebtoken';

export interface UsersService {
    publishRegistrationRequest(nickname: Nickname, email: Email, password: PasswordHash): Effect<void, EmailAlreadyInUseError>;
    approveRegistrationRequest(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    rejectRegistrationRequest(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    removeUser(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    updateUserData(token: Token, nickname?: Nickname, email?: Email, password?: PasswordHash): Effect<void, UserNotFoundError | EmailAlreadyInUseError | TokenError>;
    getAllUsers(token: Token): Effect<Iterable<User>, InvalidTokenError>;
    getUserData(token: Token): Effect<User, InvalidTokenError>;
    login(email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError>;
    verifyToken(token: Token): Effect<void, InvalidTokenError>;
    makeToken(value: string): Effect<Token, InvalidTokenFormatError>;
}

export class UsersServiceImpl implements UsersService {
    
    constructor(
        private userRepository: UserRepository,
        private adminEmail: Email,
        private secret: string,
    ) { }
    
    publishRegistrationRequest(
        nickname: Nickname,
        email: Email,
        password: PasswordHash,
    ): Effect<void, EmailAlreadyInUseError> {
        const newUser = User(nickname, email, password, Role.User);
        return this.userRepository.add(newUser).pipe(Eff.mapError(() => EmailAlreadyInUseError()));
    }
    
    getAllUsers(token: Token): Effect<Iterable<User>, InvalidTokenError> {
        return this.verifyToken(token).pipe(
            Eff.flatMap(() => this.userRepository.getAll())
        );
    }
    
    login(email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError> {
        return pipe(
            this.userRepository.find(email),
            Eff.flatMap(user => {
                if (user.passwordHash !== password) {
                    return Eff.fail(InvalidCredentialsError())
                }
                const source = jwt.sign({ email: user.email, role: user.role}, this.secret, { expiresIn: '1h' });
                return Eff.succeed(Token(user.email, user.role, source));
            }),
            Eff.mapError(() => InvalidCredentialsError())
        );
    }
    
    verifyToken(token: Token): Effect<void, InvalidTokenError> {
        if (jwt.verify(token.source, this.secret)) {
            return Eff.succeed(null);
        }
        return Eff.fail(InvalidTokenError())
    }
    
    makeToken(value: string): Effect<Token, InvalidTokenFormatError> {
        return pipe(
            Eff.try({
                try: () => jwt.decode(value) as {email: string, role: Role},
                catch: () => InvalidTokenFormatError(),
            }),
            Eff.flatMap((decoded) => 
                decoded
                ? Eff.succeed(Token(Email(decoded.email), decoded.role, value))
                : Eff.fail(InvalidTokenFormatError())
            )
        );
    }
}
