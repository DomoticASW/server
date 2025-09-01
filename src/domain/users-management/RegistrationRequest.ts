import { Nickname, Email, PasswordHash } from "./User.js"

export interface RegistrationRequest {
  readonly nickname: Nickname
  readonly email: Email
  readonly passwordHash: PasswordHash
}

export function RegistrationRequest(
  nickname: Nickname,
  email: Email,
  passwordHash: PasswordHash
): RegistrationRequest {
  return new RegistrationRequestImpl(nickname, email, passwordHash)
}

class RegistrationRequestImpl implements RegistrationRequest {
  constructor(
    public readonly nickname: Nickname,
    public readonly email: Email,
    public readonly passwordHash: PasswordHash
  ) {}
}
