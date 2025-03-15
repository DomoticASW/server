import { Email } from "./User.js";
import { invalidTokenFormatError } from "./Errors.js";

export enum UserRole {
    Admin = "Admin",
    User = "User"
}

export interface Token {
    readonly userEmail: Email;
    readonly role: UserRole;

    new(userEmail: Email): Token | invalidTokenFormatError;
}
