import { Email } from "./User.js";

export enum UserRole {
    Admin = "Admin",
    User = "User"
}

export interface Token {
    readonly userEmail: Email;
    readonly role: UserRole;
    readonly source: string
}

export function Token(userEmail: Email, role: UserRole, source: string): Token {
    return new TokenImpl(userEmail, role, source);
}

class TokenImpl implements Token {    
    constructor(
        public readonly userEmail: Email,
        public readonly role: UserRole,
        public readonly source: string
    ) {}
}
