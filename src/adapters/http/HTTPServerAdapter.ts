import express, { NextFunction, Request, Response } from 'express';
import { registerDeviceGroupsServiceRoutes } from './routes/DeviceGroupsService.js';
import { DeviceGroupsService } from '../../ports/devices-management/DeviceGroupsService.js';
import { UsersService } from '../../ports/users-management/UsersService.js';
import bodyParser from 'body-parser';
import { registerDevicesServiceRoutes } from './routes/DevicesService.js';
import { DevicesService } from '../../ports/devices-management/DevicesService.js';
import { DeviceEventsService } from '../../ports/devices-management/DeviceEventsService.js';
import { registerDeviceEventsServiceRoutes } from './routes/DeviceEventsService.js';
import { createServer, Server } from 'node:http';
import { NotificationsService } from '../../ports/notifications-management/NotificationsService.js';
import { NotificationProtocolSocketIOAdapter } from '../notifications-management/NotificationProtocolSocketIOAdapter.js';

interface Options {
    logRequestUrls?: boolean
    logRequestBodies?: boolean
}

export class HTTPServerAdapter {

    constructor(
        host: string,
        port: number,
        deviceGroupsService: DeviceGroupsService,
        devicesService: DevicesService,
        deviceEventsService: DeviceEventsService,
        usersService: UsersService,
        notificationsService: NotificationsService,
        { logRequestBodies = false, logRequestUrls = false }: Options = {}
    ) {
        const app = express();
        const server = createServer(app)

        app.use(bodyParser.json())
        app.use(express.static('client/dist'))
        app.use((req: Request, _res: Response, next: NextFunction) => {
            if (logRequestUrls) { console.log(`${req.method} ${req.url}`) }
            if (logRequestBodies) { console.log(req.body) }
            if (logRequestUrls || logRequestBodies) { console.log() }
            next()
        })
        registerDevicesServiceRoutes(app, devicesService, usersService)
        registerDeviceGroupsServiceRoutes(app, deviceGroupsService, usersService)
        registerDeviceEventsServiceRoutes(app, deviceEventsService)

        registerNotificationsServiceProtocol(server, notificationsService)

        server.listen(port, async () => {
            return console.log(`Express is listening at http://${host}:${port}`);
        });
    }
}

export function registerNotificationsServiceProtocol(server: Server, notificationsService: NotificationsService) {
    notificationsService.setupNotificationProtocol(new NotificationProtocolSocketIOAdapter(server))
}