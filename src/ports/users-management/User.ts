export type Nickname = string;
export type Email = string;
export type PasswordHash = string;

export interface User {
    nickname: Nickname;
    readonly email: Email;
    passwordHash: PasswordHash;
}

export interface Admin extends User {
    role: 'admin';
}

export function createAdmin(nickname: Nickname, email: Email, passwordHash: PasswordHash): Admin {
    return { nickname, email, passwordHash, role: 'admin' };
}
