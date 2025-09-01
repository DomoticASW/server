import { Email, Role } from "./User.js"

export interface Token {
  readonly userEmail: Email
  readonly role: Role
  readonly source: string
}

export function Token(userEmail: Email, role: Role, source: string): Token {
  return new TokenImpl(userEmail, role, source)
}

class TokenImpl implements Token {
  constructor(
    public readonly userEmail: Email,
    public readonly role: Role,
    public readonly source: string
  ) {}
}
