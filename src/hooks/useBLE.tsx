/* eslint-disable no-bitwise */
import {useState} from "react";
import {PermissionsAndroid, Platform} from "react-native";

import * as ExpoDevice from "expo-device";

import base64 from "react-native-base64";
import {
    BleError,
    BleManager,
    Characteristic,
    Device,
} from "react-native-ble-plx";

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const COLOR_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1217";
const LOCK_STATE_CHARACTERISTIC_UUID = "12345678-1234-1234-1234-1234567890ad";
const COMMAND_CHARACTERISTIC_UUID = "12345678-1234-1234-1234-1234567890ac";
const MAC_ADDRESS_CHARACTERISTIC_UUID = "12345678-1234-1234-1234-1234567890ae";
const bleManager = new BleManager();

function useBLEInternal() {
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [color, setColor] = useState("white");
    const [macAddress, setMacAddress] = useState("");
    const getBleManager = () => bleManager;

    const decodeValue = (value: string | null | undefined) =>
        value ? base64.decode(value) : "";

    const encodeValue = (value: string) => base64.encode(value);

    const requestAndroid31Permissions = async () => {
        const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const fineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );

        return (
            bluetoothScanPermission === "granted" &&
            bluetoothConnectPermission === "granted" &&
            fineLocationPermission === "granted"
        );
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Bluetooth Low Energy requires Location",
                        buttonPositive: "OK",
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const isAndroid31PermissionsGranted =
                    await requestAndroid31Permissions();

                return isAndroid31PermissionsGranted;
            }
        } else {
            return true;
        }
    };

    const connectToDevice = async (device: Device) => {
        try {
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics();
            bleManager.stopDeviceScan();

            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
        }
    };

    const disconnectFromDevice = async (deviceId?: string) => {
        const targetId = deviceId || connectedDevice?.id;
        if (!targetId) return;

        try {
            await bleManager.cancelDeviceConnection(targetId);
        } catch (e) {
            console.log("FAILED TO DISCONNECT", e);
        } finally {
            setConnectedDevice(null);
        }
    };

    const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const scanForPeripherals = () =>
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log(error);
                return;
            }

            if (!device || !device.id) {
                return;
            }

            const deviceName = (device.localName || device.name || "").toLowerCase();

            const isEsp = deviceName.includes("esp32");
            setAllDevices((prevState: Device[]) => {
                if (!isDuplicateDevice(prevState, device) && isEsp) {
                    return [...prevState, device];
                }
                return prevState;
            });
        });

    const onDataUpdate = (
        error: BleError | null,
        characteristic: Characteristic | null
    ) => {
        if (error) {
            console.log(error);
            return;
        } else if (!characteristic?.value) {
            console.log("No Data was received");
            return;
        }

        const colorCode = decodeValue(characteristic.value);

        let color = "white";
        if (colorCode === "B") {
            color = "blue";
        } else if (colorCode === "R") {
            color = "red";
        } else if (colorCode === "G") {
            color = "green";
        }

        setColor(color);
    };

    const startStreamingData = async (device: Device) => {
        if (device) {
            device.monitorCharacteristicForService(
                SERVICE_UUID,
                COLOR_CHARACTERISTIC_UUID,
                onDataUpdate
            );
        } else {
            console.log("No Device Connected");
        }
    };

    const subscribeToLockState = async (
        d: Device | null | undefined,
        callback = (value: string | null | undefined) => {}
    ) => {
        if (!d) {
            console.log("No Device Connected");
            return;
        }

        d.monitorCharacteristicForService(
            SERVICE_UUID,
            LOCK_STATE_CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (error) {
                    console.log("Monitor error:", error);
                    return;
                }

                const decoded = decodeValue(characteristic?.value);
                callback(decoded || "");

                // if (characteristic?.value) {
                //     const decoded = atob(characteristic.value); // base64 → string
                //     console.log("Notification state:", decoded);
                //
                //     if (decoded === "LOCKED" || decoded === "UNLOCKED") {
                //         setLockState(decoded);
                //     } else {
                //         setLockState("UNKNOWN");
                //     }
                // }
            }
        );
    };

    const readMacAddress = async (d?: Device) => {
        const target = d || connectedDevice;
        if (!target) return;

        try {
            const char: Characteristic = await target.readCharacteristicForService(
                SERVICE_UUID,
                MAC_ADDRESS_CHARACTERISTIC_UUID
            );

            if (char.value) {
                const decoded = decodeValue(char.value); // base64 → string, e.g. "LOCKED"

                return decoded;
            }
        } catch (e) {
            console.log("Read error:", e);
        }
    };
    const readLockState = async (d?: Device) => {
        const target = d || connectedDevice;
        if (!target) return;

        try {
            const char: Characteristic = await target.readCharacteristicForService(
                SERVICE_UUID,
                LOCK_STATE_CHARACTERISTIC_UUID
            );

            if (char.value) {
                const decoded = decodeValue(char.value); // base64 → string, e.g. "LOCKED"
                
                return decoded;
            }
        } catch (e) {
            console.log("Read error:", e);
        }
    };

    const sendCommand = async (command: string, device = connectedDevice) => {
        if (device) {
            const base64Command = encodeValue(command); // string → base64

            try {
                await device.writeCharacteristicWithResponseForService(
                    SERVICE_UUID,
                    COMMAND_CHARACTERISTIC_UUID,
                    base64Command
                );
                console.log("Sent command:", command);
            } catch (e) {
                console.log("Ble Write error", e);
            }
        } else {
            console.log("No Device Connected");
        } 
    };

    const resetDevices = () => {
        // setAllDevices([])
    };

    const stopScan = () => {
        bleManager.stopDeviceScan();
    };

    return {
        connectToDevice,
        allDevices,
        connectedDevice,
        color,
        requestPermissions,
        scanForPeripherals,
        startStreamingData,
        resetDevices,
        stopScan,
        getBleManager,
        sendCommand,
        disconnectFromDevice,
        subscribeToLockState,
        readLockState,
        SERVICE_UUID,
        COLOR_CHARACTERISTIC_UUID,
        LOCK_STATE_CHARACTERISTIC_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        readMacAddress
    };
}
export default useBLEInternal;
