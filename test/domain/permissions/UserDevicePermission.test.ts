import { DeviceId } from "../../../src/domain/devices-management/Device.js"
import { UserDevicePermission } from "../../../src/domain/permissions-management/UserDevicePermission.js"
import { Email } from "../../../src/domain/users-management/User.js"
 
 function makeUserDevicePermission(email: string = "marcoraggio@gmail.com", deviceId: string = "1") {
     return UserDevicePermission(Email(email), DeviceId(deviceId))
 }
 
 test("UserDevicePermission creation", () => {
     const deviceId = "1"
     const emailValue = "Bedroom"
     const id = DeviceId(deviceId)
     const email = Email(emailValue)
     expect(id).toBe(deviceId)
     expect(email).toBe(emailValue)
 })
 
 test("UserDevicePermission testing field", () => {
     expect(makeUserDevicePermission().deviceId).toBe("1")
     expect(makeUserDevicePermission().email).toBe("marcoraggio@gmail.com")
 })