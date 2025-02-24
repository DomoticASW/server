import express from 'express';
import { NotificationsService } from '../ports/notifications/NotificationService.js';


export class HTTPServerAdapter {

    constructor(port: number, notificationService: NotificationsService) {
        const app = express();

        app.get('/api', (req, res) => {
            res.send(notificationService.sendNotification("", ""));
        });

        app.use(express.static('client/dist'))

        app.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }

}