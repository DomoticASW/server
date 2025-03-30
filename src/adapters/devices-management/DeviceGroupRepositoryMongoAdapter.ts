import mongoose from "mongoose";
import { DeviceGroup, DeviceGroupId } from "../../domain/devices-management/DeviceGroup.js";
import { BaseRepositoryMongoAdapter } from "../BaseRepositoryMongoAdapter.js";

// Export is needed in order to test the adapter
export interface DeviceGroupSchema {
    _id: string,
    name: string
}

export class DeviceGroupRepositoryMongoAdapter extends BaseRepositoryMongoAdapter<DeviceGroupId, DeviceGroup, string, DeviceGroupSchema> {

    private deviceGroupSchema = new mongoose.Schema<DeviceGroupSchema>({
        _id: { type: String, required: true },
        name: { type: String, required: true }
    });
    private DG: mongoose.Model<DeviceGroupSchema>

    constructor(connection: mongoose.Connection) {
        super(connection)
        this.DG = connection.model("DeviceGroup", this.deviceGroupSchema, undefined, { overwriteModels: true })
    }

    protected toDocument(e: DeviceGroup): mongoose.Document<unknown, object, DeviceGroupSchema> & DeviceGroupSchema {
        return new this.DG({ _id: e.id, name: e.name })
    }

    protected toEntity(s: DeviceGroupSchema): DeviceGroup {
        return DeviceGroup(DeviceGroupId(s._id), s.name)
    }

    protected model(): mongoose.Model<DeviceGroupSchema> {
        return this.DG
    }
}