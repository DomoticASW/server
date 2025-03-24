import express from 'express';
import { DeviceGroupRepositoryMongoAdapter } from './devices-management/DeviceGroupRepository.js';
import { DeviceGroupId } from '../domain/devices-management/DeviceGroup.js';
import { Effect, pipe } from 'effect';

export class HTTPServerAdapter {

    constructor(port: number) {
        const app = express();

        const adapter = new DeviceGroupRepositoryMongoAdapter("localhost:27017")
        app.get('/create', async (req, res) => {
            await pipe(
                adapter.add(adapter.DeviceGroup(DeviceGroupId("1"), "camera")),
                Effect.match({
                    onSuccess() { res.sendStatus(200) },
                    onFailure(err) { res.send(err) }
                }),
                Effect.runPromise
            )
        });
        app.get('/get/:id', async (req, res) => {
            await pipe(
                adapter.find(DeviceGroupId(req.params.id)),
                Effect.match({
                    onSuccess(dg) { res.send(dg) },
                    onFailure(err) { res.send(err) }
                }),
                Effect.runPromise
            )
        });
        app.get('/get', async (req, res) => {
            await pipe(
                adapter.getAll(),
                Effect.map(dgs => res.send(dgs)),
                Effect.runPromise
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
