import { Brand } from "../../utils/Brand.js";

export type Nickname = Brand<string, "Nickname">
export type Email = Brand<string, "Email">
export type PasswordHash = Brand<string, "PasswordHash">

export function Email(email: string): Email { return email as Email }
export function Nickname(nickname: string): Nickname { return nickname as Nickname }
export function PasswordHash(passwordHash: string): PasswordHash { return passwordHash as PasswordHash }

export enum Role {
    Admin = "Admin",
    User = "User"
}

export interface User {
    nickname: Nickname;
    readonly email: Email;
    passwordHash: PasswordHash;
    role: Role;
}

export type Admin = Brand<User, "Admin">

export function User(nickname: Nickname, email: Email, passwordHash: PasswordHash, role: Role): User {
    return new UserImpl(nickname, email, passwordHash, role);
}

export class UserImpl implements User {
    constructor(
        public nickname: Nickname,
        public readonly email: Email,
        public passwordHash: PasswordHash,
        public role: Role
    ) {}
}