import { Effect } from "effect/Effect";
import { User, Nickname, Email, PasswordHash, Role, UserImpl } from "../../domain/users-management/User.js";
import { Token } from "../../domain/users-management/Token.js";
import { EmailAlreadyInUseError, UserNotFoundError, TokenError, InvalidTokenError, InvalidCredentialsError, InvalidTokenFormatError, userNotFoundError } from "./Errors.js";
import { UserRepository } from "./UserRepository.js";
import { succeed } from "effect/Exit";

export interface UsersService {
    publishRegistrationRequest(nickname: Nickname, email: Email, password: PasswordHash): Effect<void, EmailAlreadyInUseError>;
    approveRegistrationRequest(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    rejectRegistrationRequest(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    removeUser(token: Token, email: Email): Effect<void, UserNotFoundError | TokenError>;
    updateUserData(token: Token, nickname?: Nickname, password?: PasswordHash): Effect<void, UserNotFoundError | TokenError>;
    getAllUsers(token: Token): Effect<Iterable<User>, InvalidTokenError>;
    getUserData(token: Token): Effect<User, InvalidTokenError>;
    getUserDataUnsafe(email: Email): Effect<User, UserNotFoundError>;
    login(email: Email, password: PasswordHash): Effect<Token, InvalidCredentialsError>;
    verifyToken(token: Token): Effect<void, InvalidTokenError>;
    makeToken(value: string): Effect<Token, InvalidTokenFormatError>;
}

export class UsersServiceImpl implements UsersService {
    constructor(
        private userRepository: UserRepository,
        private adminEmail: Email
    ) {}
    
    publishRegistrationRequest(
        nickname: Nickname, 
        email: Email, 
        password: PasswordHash,
    ): Promise<Effect<void, EmailAlreadyInUseError>> {
        try {
            // Check if email already exists
            const existingUser = this.userRepository.find(email);
            if (existingUser) {
                fail(EmailAlreadyInUseError())
            };
            
            const newUser = new UserImpl(nickname, email, password, Role.User);            
            this.userRepository.add(newUser);
            
            return Promise.resolve(succeed(undefined));
        } catch (error) {
            console.error('Error in publishRegistrationRequest:', error);
            return fail(EmailAlreadyInUseError())
        };
    }
}