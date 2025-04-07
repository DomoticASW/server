import express from 'express';
import { DeviceGroup, DeviceGroupId } from '../domain/devices-management/DeviceGroup.js';
import { Effect, pipe } from 'effect';
import { DeviceGroupRepository } from '../ports/devices-management/DeviceGroupRepository.js';

export class HTTPServerAdapter {

    // TODO: change parameter types to interfaces and not implementations
    constructor(port: number, deviceGroupRepository: DeviceGroupRepository) {
        const app = express();

        app.get('/create', async (req, res) => {
            await pipe(
                deviceGroupRepository.add(DeviceGroup(DeviceGroupId("1"), "camera")),
                Effect.match({
                    onSuccess() { res.sendStatus(200) },
                    onFailure(err) { res.send(err) }
                }),
                Effect.runPromise
            )
        });
        app.get('/get/:id', async (req, res) => {
            await pipe(
                deviceGroupRepository.find(DeviceGroupId(req.params.id)),
                Effect.match({
                    onSuccess(dg) { res.send(dg) },
                    onFailure(err) { res.send(err) }
                }),
                Effect.runPromise
            )
        });
        app.get('/get', async (req, res) => {
            await pipe(
                deviceGroupRepository.getAll(),
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
