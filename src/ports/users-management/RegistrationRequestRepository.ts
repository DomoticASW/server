import { Repository } from "../Repository.js";
import { Email } from "../../domain/users-management/User.js";
import { RegistrationRequest } from "../../domain/users-management/RegistrationRequest.js";
 
export type RegistrationRequestRepository = Repository<Email, RegistrationRequest>;
