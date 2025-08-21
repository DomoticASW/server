import { Namespace } from "socket.io";
import { DevicePropertyUpdatesSubscriber, DevicesService } from "../../ports/devices-management/DevicesService.js";

export function startSocketIOPropertyUpdatesSubscriber(io: Namespace, devicesService: DevicesService) {
    io.on("connection", (socket) => {
        socket.on("subscribe", (data: { deviceId: string }) => {
            socket.join(data.deviceId);
        });
    });

    const subscriber: DevicePropertyUpdatesSubscriber = {
        devicePropertyChanged(deviceId, propertyId, value) {
            io.to(deviceId).emit("device-property-update", {
                deviceId,
                propertyId,
                value,
            });
        },
    };

    devicesService.subscribeForDevicePropertyUpdates(subscriber);
}
