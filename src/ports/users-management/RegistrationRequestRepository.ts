import { Repository } from "../Repository.js";
import { Email } from "./User.js";
import { RegistrationRequest } from "./RegistrationRequest.js";
 
export type RegistrationRequestRepository = Repository<Email, RegistrationRequest>;
