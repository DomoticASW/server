import { Brand } from "../../utils/Brand.js";

export type Nickname = Brand<string, "Nickname">
export type Email = Brand<string, "Email">
export type PasswordHash = Brand<string, "PasswordHash">

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
