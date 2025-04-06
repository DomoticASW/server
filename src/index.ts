import mongoose from "mongoose";
import { HTTPServerAdapter } from "./adapters/HTTPServerAdapter.js";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepositoryMongoAdapter.js";

const mongoDBConnection = mongoose.createConnection("mongodb://localhost:27017/DomoticASW")
new HTTPServerAdapter(3000, new DeviceGroupRepositoryMongoAdapter(mongoDBConnection))
