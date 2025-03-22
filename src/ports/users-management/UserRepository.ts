import { Repository } from "../Repository.js";
import { Email, User } from "../../domain/users-management/User.js";
 
export type UserRepository = Repository<Email, User>;
