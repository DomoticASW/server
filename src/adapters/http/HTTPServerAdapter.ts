import express from 'express';
import { DeviceGroupRepository } from '../../ports/devices-management/DeviceGroupRepository.js';
import { registerDeviceGroupRoutes } from './routes/DeviceGroupsService.js';

export class HTTPServerAdapter {

    // TODO: change parameter types to interfaces and not implementations
    constructor(port: number, deviceGroupRepository: DeviceGroupRepository) {
        const app = express();

        registerDeviceGroupRoutes(app, deviceGroupRepository)

        app.use(express.static('client/dist'))

        app.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}
