import express from "express";
import { pipe, Effect } from "effect";
import { DeviceGroup, DeviceGroupId } from "../../../domain/devices-management/DeviceGroup.js";
import { DeviceGroupRepository } from "../../../ports/devices-management/DeviceGroupRepository.js";

export function registerDeviceGroupRoutes(app: express.Express, deviceGroupRepository: DeviceGroupRepository) {
    app.post('/api/deviceGroups', async (req, res) => {
        await pipe(
            deviceGroupRepository.add(DeviceGroup(DeviceGroupId("1"), "camera", [])),
            Effect.match({
                onSuccess() { res.sendStatus(200) },
                onFailure(err) { res.send(err) }
            }),
            Effect.runPromise
        )
    });
    app.get('/api/deviceGroups/:id', async (req, res) => {
        await pipe(
            deviceGroupRepository.find(DeviceGroupId(req.params.id)),
            Effect.match({
                onSuccess(dg) { res.send(dg) },
                onFailure(err) { res.send(err) }
            }),
            Effect.runPromise
        )
    });
    app.get('/api/deviceGroups', async (req, res) => {
        await pipe(
            deviceGroupRepository.getAll(),
            Effect.map(dgs => res.send(dgs)),
            Effect.runPromise
        )
    });
}
