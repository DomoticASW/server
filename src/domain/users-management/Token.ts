import { Email } from "./User.js";
import { createHash } from "crypto";
import { InvalidTokenFormatError } from "../../ports/users-management/Errors.js";
import { Brand } from "../../utils/Brand.js";

export enum UserRole {
    Admin = "Admin",
    User = "User"
}

export interface Token {
    readonly userEmail: Email;
    readonly role: UserRole;
    
    newToken(string: string): Brand<string, "Token" | InvalidTokenFormatError>;
}

export function Token(userEmail: Email, role: UserRole): Token {
    return new TokenImpl(userEmail, role);
}

class TokenImpl implements Token {
    constructor(
        public readonly userEmail: Email,
        public readonly role: UserRole
    ) {}
    
    newToken(value: string): Brand<string, "Token" | InvalidTokenFormatError> {
        if (!value) {
            throw new Error("Not implemented yet");
        }
        return createHash("sha256").update(value).digest("hex") as Brand<string, "Token">;
    }
}
