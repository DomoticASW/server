import express from 'express';
import { registerDeviceGroupsServiceRoutes } from './routes/DeviceGroupsService.js';
import { DeviceGroupsService } from '../../ports/devices-management/DeviceGroupsService.js';
import { UsersService } from '../../ports/users-management/UserService.js';
import bodyParser from 'body-parser';

export class HTTPServerAdapter {

    // TODO: change parameter types to interfaces and not implementations
    constructor(port: number, deviceGroupsService: DeviceGroupsService, usersService: UsersService) {
        const app = express();

        app.use(bodyParser.json())
        app.use(express.static('client/dist'))

        registerDeviceGroupsServiceRoutes(app, deviceGroupsService, usersService)

        app.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}
