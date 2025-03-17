export type Nickname = string;
export type Email = string;
export type PasswordHash = string;

export interface User {
    nickname: Nickname;
    readonly email: Email;
    passwordHash: PasswordHash;
}

// TODO: fix
export type Admin = User
