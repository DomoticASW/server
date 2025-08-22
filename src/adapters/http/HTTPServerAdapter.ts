import express, { NextFunction, Request, Response } from 'express';
import http from "http";
import history from 'connect-history-api-fallback'
import { Server as SocketIOServer } from 'socket.io';
import { registerDeviceGroupsServiceRoutes } from './routes/devices-management/DeviceGroupsService.js';
import { DeviceGroupsService } from '../../ports/devices-management/DeviceGroupsService.js';
import { UsersService } from '../../ports/users-management/UsersService.js';
import { registerDevicesServiceRoutes } from './routes/devices-management/DevicesService.js';
import { DevicesService } from '../../ports/devices-management/DevicesService.js';
import { DeviceEventsService } from '../../ports/devices-management/DeviceEventsService.js';
import { registerDeviceEventsServiceRoutes } from './routes/devices-management/DeviceEventsService.js';
import { NotificationsService } from '../../ports/notifications-management/NotificationsService.js';
import { registerScriptsServiceRoutes } from './routes/ScriptsService.js';
import { ScriptsService } from '../../ports/scripts-management/ScriptsService.js';
import { NotificationProtocolSocketIOAdapter } from '../notifications-management/NotificationProtocolSocketIOAdapter.js';
import { registerNotificationsServiceRoutes } from './routes/NotificationsService.js';
import { DeviceActionsService } from '../../ports/devices-management/DeviceActionsService.js';
import { registerPermissionsServiceRoutes } from './routes/PermissionsService.js';
import { PermissionsService } from '../../ports/permissions-management/PermissionsService.js';
import { registerUsersServiceRoutes } from './routes/UsersService.js';
import { Brand } from '../../utils/Brand.js';
import { Error } from '../../ports/Error.js';

interface Options {
    logRequestUrls?: boolean
    logRequestBodies?: boolean
}

type BadRequestError = Brand<Error, "BadRequestError">
export function BadRequestError(message?: string, cause?: string): BadRequestError {
    return { message: message ?? "The request was malformed", cause: cause, __brand: "BadRequestError" }
}

export class HTTPServerAdapter {

    constructor(
        host: string,
        port: number,
        deviceGroupsService: DeviceGroupsService,
        devicesService: DevicesService,
        deviceActionsService: DeviceActionsService,
        deviceEventsService: DeviceEventsService,
        usersService: UsersService,
        notificationsService: NotificationsService,
        scriptsService: ScriptsService,
        permissionsService: PermissionsService,
        { logRequestBodies = false, logRequestUrls = false }: Options = {}
    ) {
        const app = express();
        const server = http.createServer(app)
        const socketIOServer = new SocketIOServer(server)

        app.use((req, res, next) => {
            express.json()(req, res, err => {
                if (err) { return res.status(400).send(BadRequestError("The received body was not valid JSON", err.message)) }
                else { next(); }
            });
        });
        app.use((req: Request, _res: Response, next: NextFunction) => {
            if (logRequestUrls) { console.log(`${req.method} ${req.url}`) }
            if (logRequestBodies) { console.log(req.body) }
            if (logRequestUrls || logRequestBodies) { console.log() }
            next()
        })
        registerDevicesServiceRoutes(app, socketIOServer, devicesService, deviceActionsService, usersService)
        registerDeviceGroupsServiceRoutes(app, deviceGroupsService, devicesService, usersService)
        registerDeviceEventsServiceRoutes(app, deviceEventsService)
        registerScriptsServiceRoutes(app, scriptsService, usersService)
        registerNotificationsServiceRoutes(app, notificationsService, usersService)
        registerNotificationsServiceProtocol(socketIOServer, notificationsService)
        registerPermissionsServiceRoutes(app, permissionsService, usersService)
        registerUsersServiceRoutes(app, usersService);

        // https://github.com/bripkens/connect-history-api-fallback?tab=readme-ov-file#introduction
        // This middleware should be placed after every other handler or if you need to move it up 
        // then you need to add an exception to not rewrite api paths, for example:
        // app.use(history({ rewrites: [{ from: /^\/api\/.*/, to: context => context.request.path },] }))
        app.use(history())
        app.use(express.static('client/dist'))

        server.listen(port, async () => {
            return console.log(`Express is listening at http://${host}:${port}`);
        });
    }
}

export function registerNotificationsServiceProtocol(server: SocketIOServer, notificationsService: NotificationsService) {
    notificationsService.setupNotificationProtocol(new NotificationProtocolSocketIOAdapter(server))
}