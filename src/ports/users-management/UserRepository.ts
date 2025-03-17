import { Repository } from "../Repository.js";
import { Email, User } from "./User.js";
 
export type UserRepository = Repository<Email, User>;
