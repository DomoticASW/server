import { pipe } from "effect";
import jwt from 'jsonwebtoken';
import { Token } from "./Token.js";
import { Effect } from "effect/Effect";
import { Effect as Eff } from "effect";
import { RegistrationRequest } from "./RegistrationRequest.js";
import { User, Nickname, Email, PasswordHash, Role } from "./User.js";
import { UsersService } from "../../ports/users-management/UsersService.js";
import { EmailAlreadyInUseError, UserNotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError, UnauthorizedError, RegistrationRequestNotFoundError, } from "../../ports/users-management/Errors.js";
import { RegistrationRequestRepository } from "../../ports/users-management/RegistrationRequestRepository.js";
import { UserRepository } from "../../ports/users-management/UserRepository.js";

export class UsersServiceImpl implements UsersService {

    constructor(
        private userRepository: UserRepository,
        private regReqRepository: RegistrationRequestRepository,
        private secret: string,
    ) { }

    getAllRegistrationRequests(token: Token): Effect<Iterable<RegistrationRequest>, InvalidTokenError> {
        return pipe(
            this.verifyToken(token),
            Eff.flatMap(() => this.regReqRepository.getAll())
        )
    }

    publishRegistrationRequest(
        nickname: Nickname,
        email: Email,
        password: PasswordHash,
    ): Effect<void, EmailAlreadyInUseError> {
        const newRegReq = RegistrationRequest(nickname, email, password);
        return pipe(
            this.regReqRepository.add(newRegReq),
            Eff.mapError(() => EmailAlreadyInUseError()
            ))
    }

    approveRegistrationRequest(token: Token, email: Email): Effect<void, EmailAlreadyInUseError | RegistrationRequestNotFoundError | TokenError> {
        return pipe(
            Eff.if(token.role == Role.Admin, {
                onTrue: () => this.verifyToken(token),
                onFalse: () => Eff.fail(UnauthorizedError())
            }),
            Eff.flatMap(() => this.regReqRepository.find(email)),
            Eff.flatMap((regReq) => {
                const newUser = User(regReq.nickname, regReq.email, regReq.passwordHash, Role.User);
                return this.userRepository.add(newUser)
            }),
            Eff.flatMap(() => this.regReqRepository.remove(email)),
            Eff.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return RegistrationRequestNotFoundError()
                    case "DuplicateIdError":
                        return EmailAlreadyInUseError("It was not possible to approve this request as the email is already used by a user")
                    default:
                        return e
                }
            }),
        )
    }

    rejectRegistrationRequest(token: Token, email: Email): Effect<void, RegistrationRequestNotFoundError | TokenError> {
        return pipe(
            Eff.if(token.role == Role.Admin, {
                onTrue: () => this.verifyToken(token),
                onFalse: () => Eff.fail(UnauthorizedError())
            }),
            Eff.flatMap(() => this.regReqRepository.remove(email)),
            Eff.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return RegistrationRequestNotFoundError()
                    default:
                        return e
                }
            }),
        )
    }

    removeUser(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError> {
        return pipe(
            this.verifyToken(token),
            Eff.flatMap(() => {
                if (token.role == Role.Admin && token.userEmail == email) {
                    return Eff.fail(UnauthorizedError())
                }
                return Eff.succeed(null)
            }),
            Eff.flatMap(() => this.userRepository.remove(email)),
            Eff.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return UserNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
        )
    }

    updateUserData(
        token: Token,
        nickname?: Nickname,
        password?: PasswordHash
    ): Effect<void, UserNotFoundError | TokenError> {
        return pipe(
            this.verifyToken(token),
            Eff.flatMap(() => this.userRepository.find(token.userEmail)),
            Eff.flatMap((user) => {
                const updatedUser = User(nickname ?? user.nickname, token.userEmail, password ?? user.passwordHash, user.role);
                return this.userRepository.update(updatedUser)
            }),
            Eff.mapError(e => {
                switch (e.__brand) {
                    case "NotFoundError":
                        return UserNotFoundError(e.cause)
                    default:
                        return e
                }
            }),
        )
    }

    getAllUsers(token: Token): Effect<Iterable<User>, InvalidTokenError> {
        return pipe(
            this.verifyToken(token),
            Eff.flatMap(() => this.userRepository.getAll()),
            Eff.mapError(() => InvalidTokenError())
        );
    }

    getUserData(token: Token): Effect<User, InvalidTokenError> {
        return pipe(
            this.verifyToken(token),
            Eff.flatMap(() => this.userRepository.find(token.userEmail)),
            Eff.mapError(() => InvalidTokenError())
        );
    }

    getUserDataUnsafe(email: Email): Effect<User, UserNotFoundError> {
        return pipe(
            this.userRepository.find(email),
            Eff.mapError(() => UserNotFoundError())
        );
    }

    login(email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError> {
        return pipe(
            this.userRepository.find(email),
            Eff.flatMap(user => {
                if (user.passwordHash !== password) {
                    return Eff.fail(InvalidCredentialsError())
                }
                const source = jwt.sign({ userEmail: user.email, role: user.role }, this.secret, { expiresIn: '1h' });
                return Eff.succeed(Token(user.email, user.role, source));
            }),
            Eff.mapError(() => InvalidCredentialsError())
        );
    }

    verifyToken(token: Token): Effect<void, InvalidTokenError> {
        return pipe(
            Eff.try({
                try: () => jwt.verify(token.source, this.secret, {
                    ignoreExpiration: false,
                    algorithms: ['HS256']
                }),
                catch: () => InvalidTokenError(),
            }),
            Eff.flatMap((decoded) => {
                if (typeof decoded === 'object' && decoded !== null && !('exp' in decoded)) {
                    return Eff.fail(InvalidTokenError());
                }
                return Eff.succeed(null);
            })
        );
    }

    makeToken(value: string): Effect<Token, InvalidTokenFormatError> {
        return pipe(
            Eff.try({
                try: () => jwt.decode(value) as { userEmail: string, role: Role },
                catch: () => InvalidTokenFormatError(),
            }),
            Eff.flatMap((decoded) =>
                decoded
                    ? Eff.succeed(Token(Email(decoded.userEmail), decoded.role, value))
                    : Eff.fail(InvalidTokenFormatError())
            )
        );
    }
}
