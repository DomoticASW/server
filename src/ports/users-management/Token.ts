import { Email } from "./User.js";

export enum UserRole {
    Admin = "Admin",
    User = "User"
}

export interface Token {
    readonly userEmail: Email;
    readonly role: UserRole;
}
