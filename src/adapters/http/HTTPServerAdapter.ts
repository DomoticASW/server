import express from 'express';
import { registerDeviceGroupsServiceRoutes } from './routes/DeviceGroupsService.js';
import { DeviceGroupsService } from '../../ports/devices-management/DeviceGroupsService.js';
import { UsersService } from '../../ports/users-management/UserService.js';
import bodyParser from 'body-parser';
import { registerDevicesServiceRoutes } from './routes/DevicesService.js';
import { DevicesService } from '../../ports/devices-management/DevicesService.js';
import { DeviceEventsService } from '../../ports/devices-management/DeviceEventsService.js';
import { registerDeviceEventsServiceRoutes } from './routes/DeviceEventsService.js';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { NotificationsService } from '../../domain/notifications-management/NotificationsServiceImpl.js';
import { DeviceStatusesService } from '../../ports/devices-management/DeviceStatusesService.js';
import { DeviceOfflineNotificationSubscriptionRepository } from '../../ports/notifications-management/DeviceOfflineNotificationSubscriptionRepository.js';

export class HTTPServerAdapter {

    // TODO: change parameter types to interfaces and not implementations
    constructor(port: number, deviceGroupsService: DeviceGroupsService, devicesService: DevicesService, deviceEventsService: DeviceEventsService, usersService: UsersService, deviceStatusesService: DeviceStatusesService, deviceOfflineNotificationSubscriptionRepository: DeviceOfflineNotificationSubscriptionRepository) {
        const app = express();
        const server = createServer(app)
        const io = new Server(server)

        app.use(bodyParser.json())
        app.use(express.static('client/dist'))

        registerDevicesServiceRoutes(app, devicesService, usersService)
        registerDeviceGroupsServiceRoutes(app, deviceGroupsService, usersService)
        registerDeviceEventsServiceRoutes(app, deviceEventsService)
        NotificationsService(deviceStatusesService, io, devicesService, usersService, deviceOfflineNotificationSubscriptionRepository)

        server.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}
