import express from 'express';
import { registerDeviceGroupsServiceRoutes } from './routes/DeviceGroupsService.js';
import { DeviceGroupsService } from '../../ports/devices-management/DeviceGroupsService.js';
import { UsersService } from '../../ports/users-management/UserService.js';
import bodyParser from 'body-parser';
import { registerDevicesServiceRoutes } from './routes/DevicesService.js';
import { DevicesService } from '../../ports/devices-management/DevicesService.js';
import { DeviceEventsService } from '../../ports/devices-management/DeviceEventsService.js';
import { registerDeviceEventsServiceRoutes } from './routes/DeviceEventsService.js';
import { createServer, Server } from 'node:http';
import { NotificationsService } from '../../ports/notifications-management/NotificationsService.js';
import { NotificationProtocolImpl } from './protocols/NotificationProtocol.js';

export class HTTPServerAdapter {

    // TODO: change parameter types to interfaces and not implementations
    constructor(port: number, deviceGroupsService: DeviceGroupsService, devicesService: DevicesService, deviceEventsService: DeviceEventsService, usersService: UsersService, notificationsService: NotificationsService) {
        const app = express();
        const server = createServer(app)

        app.use(bodyParser.json())
        app.use(express.static('client/dist'))

        registerDevicesServiceRoutes(app, devicesService, usersService)
        registerDeviceGroupsServiceRoutes(app, deviceGroupsService, usersService)
        registerDeviceEventsServiceRoutes(app, deviceEventsService)

        registerNotificationsServiceProtocol(server, notificationsService)

        server.listen(port, async () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}

export function registerNotificationsServiceProtocol(server: Server, notificationsService: NotificationsService) {
  notificationsService.setupNotificationProtocol(new NotificationProtocolImpl(server))
}