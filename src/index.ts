import mongoose from "mongoose";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepository.js";
import { HTTPServerAdapter } from "./adapters/HTTPServerAdapter.js";

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
new HTTPServerAdapter(3000, new DeviceGroupRepositoryMongoAdapter(mongoDBConnection))
