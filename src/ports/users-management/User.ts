export type Nickname = string;
export type Email = string;
export type PasswordHash = string;

export interface User {
    nickname: Nickname;
    email: Email;
    passwordHash: PasswordHash;
}

export interface Admin extends User {}
