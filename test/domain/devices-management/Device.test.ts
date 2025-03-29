import { DeviceId } from "../../../src/domain/devices-management/Device.js";

test("DeviceId can be created", () => {
  const deviceId = DeviceId("Id");
  expect(deviceId).toBe("Id");
});