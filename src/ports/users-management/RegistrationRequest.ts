import { Nickname, Email, PasswordHash } from "./User.js";

export interface RegistrationRequest {
    nickname: Nickname;
    email: Email;
    passwordHash: PasswordHash;

    new(nickname: Nickname, email: Email, passwordHash: PasswordHash): RegistrationRequest;
}
