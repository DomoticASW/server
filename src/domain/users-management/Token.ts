import { Email } from "./User.js";
import { InvalidTokenFormatError } from "../../ports/users-management/Errors.js";
import { Brand } from "../../utils/Brand.js";
import jwt from 'jsonwebtoken';

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
    private static SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-secret-key';
    
    constructor(
        public readonly userEmail: Email,
        public readonly role: UserRole
    ) {}
    
    newToken(value: string): Brand<string, "Token" | InvalidTokenFormatError> {
        try {
            const decoded = jwt.verify(value, TokenImpl.SECRET_KEY) as {
                userEmail: string;
                role: string;
            };
            
            if (!decoded.userEmail || !decoded.role) {
                return "InvalidTokenFormatError" as Brand<string, InvalidTokenFormatError>;
            }

            return value as Brand<string, "Token">;
        } catch (error) {
            return "InvalidTokenFormatError" as Brand<string, InvalidTokenFormatError>;
        }
    }
}
