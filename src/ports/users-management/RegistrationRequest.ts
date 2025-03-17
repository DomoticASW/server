import { Nickname, Email, PasswordHash } from "./User.js";

export interface RegistrationRequest {
    readonly nickname: Nickname;
    readonly email: Email;
    readonly passwordHash: PasswordHash;
}
