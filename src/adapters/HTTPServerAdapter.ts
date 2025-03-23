import express from 'express';
import { DeviceGroupRepositoryMongoAdapter } from './devices-management/DeviceGroupRepository.js';
import { DeviceGroupId } from '../domain/devices-management/DeviceGroup.js';
import { Result } from 'option-t/plain_result/namespace';

export class HTTPServerAdapter {

    constructor(port: number) {
        const app = express();

        const adapter = new DeviceGroupRepositoryMongoAdapter("localhost:27017")
        app.get('/create', async (req, res) => {
            const result = await adapter.add(adapter.DeviceGroup(DeviceGroupId("1"), "camera"))
            Result.mapOrElse(
                result,
                err => res.send(err),
                () => res.sendStatus(200)
            )
        });
        app.get('/get', async (req, res) => {
            const dg = await adapter.find(DeviceGroupId("1"))
            Result.mapOrElse(
                dg,
                err => res.send(err),
                dg => res.send(dg)
            )
        });
        app.get('/getNone', async (req, res) => {
            const dg = await adapter.find(DeviceGroupId("2"))
            Result.mapOrElse(
                dg,
                err => res.send(err),
                dg => res.send(dg)
            )
        });

        app.get('/api', (req, res) => {
            res.send("API");
        });

        app.use(express.static('client/dist'))

        app.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}
