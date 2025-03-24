import { connectDBs } from "./Database.js";
import { DeviceGroupRepositoryMongoAdapter } from "./adapters/devices-management/DeviceGroupRepository.js";
import { HTTPServerAdapter } from "./adapters/HTTPServerAdapter.js";

await connectDBs()
new HTTPServerAdapter(3000, new DeviceGroupRepositoryMongoAdapter())
