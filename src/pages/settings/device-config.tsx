import {ScrollView, Text, TouchableOpacity, View} from "react-native";
import styles from "@/src/pages/settings/styles";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {AppContext} from "@/src/context/app-context";
import {useRouter} from "expo-router";
import {Dialog} from "@/src/components/dialog";
import {useBLE} from "@/src/context/ble-context";
import {useFocusEffect} from "@react-navigation/native";

export default function DeviceConfig() {
    const {user, deviceId, signout, isDeviceConnected} = useContext(AppContext);
    const router = useRouter();
    const [openBluetoothConnection, setOpenBluetoothConnection] = useState(false);
    const connectedDevice = {
        id: "smartlock_D0DB64A84320",
        name: "Smart Lock",
        localName: "Smart Lock",
    }
    const {
        allDevices,
        // connectedDevice,
        connectToDevice,
        disconnectFromDevice,
        requestPermissions,
        scanForPeripherals,
        stopScan,
        resetDevices,
    } = useBLE();

    function deviceHasName(device: any) {
        const name = (device.name || "").trim();
        const localName = (device.localName || "").trim();
        return Boolean(name || localName);
    }

    // -------- BLE scanning (local mode, unchanged) --------
    useEffect(() => {
        let cancelled = false;
        const start = async () => {
            const ok = await requestPermissions();
            if (!ok || cancelled) return;
            resetDevices();
            scanForPeripherals();
        };
        
        if (openBluetoothConnection) {
            start();
        } else {
            resetDevices();
        }

        return () => {
            cancelled = true;
            stopScan();
        };
    }, [openBluetoothConnection, requestPermissions, scanForPeripherals, stopScan, resetDevices]);
   
    
    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Device Configuration</Text>
                <Text style={styles.subtitle}>Manage connectivity and device behavior</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.rowTitle}>Device info</Text>
                <Text style={styles.rowSubtitle}>Update network credentials for the lock.</Text>
                <InfoRow label="Device ID" value={deviceId}/>
                <InfoRow label="Wifi Status" value={"Online"}/>
            </View>

            {
                connectedDevice === null ? (
                    <View style={styles.card}>
                        <Text style={styles.rowTitle}>Bluetooth Configuration</Text>
                        <Text style={styles.rowSubtitle}>Configurate device via bluetooth</Text>
                        <TouchableOpacity onPress={() => setOpenBluetoothConnection(true)}  style={[styles.button, styles.button]}>
                            <Text  style={[styles.buttonText, styles.buttonOutlineText]} >Connect</Text>
                        </TouchableOpacity>
                    </View>
                ) :
                    <View style={styles.card}>
                        <Text style={styles.rowTitle}>Bluetooth Configuration</Text>
                        <Text style={styles.rowSubtitle}>Configurate device via bluetooth</Text>

                        <BluetoothDeviceCard key={connectedDevice.id} device={connectedDevice} isConnected={true} disconnectFromDevice={disconnectFromDevice} connectToDevice={connectToDevice}/>
                    </View>
                    
                    
            }
                


            <Dialog 
                visible={openBluetoothConnection} 
                title="Bluetooth Connection" 
                // description={"yo"}
                onDismiss={() => {
                    stopScan();
                    resetDevices();
                    setOpenBluetoothConnection(false);
                }}
                primaryAction={{
                    label: "Close",
                    onPress: () => {
                        stopScan();
                        resetDevices();
                        setOpenBluetoothConnection(false);
                    },
                }}
            >
                {/* Discovered devices */}
                <View style={{marginTop: 8}}>
                    <Text style={{fontSize: 16, fontWeight: "600", marginBottom: 8}}>
                        Available Devices
                    </Text>
                    {allDevices.length === 0 ? (
                        <Text style={{color: "#6b7280"}}>No devices found yet.</Text>
                    ) : (
                        allDevices
                            .filter((device) => deviceHasName(device))
                            .map((device) => {
                                const isConnected = connectedDevice?.id === device.id;
                                return (
                                    <BluetoothDeviceCard key={device.id} device={device} isConnected={isConnected} disconnectFromDevice={disconnectFromDevice} connectToDevice={connectToDevice}/>
                                );
                            })
                    )}
                </View>
        
            </Dialog>
        </ScrollView>
    );
}


const BluetoothDeviceCard = ({device, isConnected, disconnectFromDevice, connectToDevice} : {device: any, isConnected: boolean, disconnectFromDevice: (device:any)=>{}, connectToDevice: (device:any)=>{}}) =>{
    return (
        <View
            key={device.id}
            style={{
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#e4e4e7",
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <View style={{flexShrink: 1}}>
                <Text style={{fontWeight: "600"}}>
                    {device.name || device.localName || "Unnamed device"}
                </Text>
                <Text style={{color: "#6b7280"}} numberOfLines={1}>
                    {device.id}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() =>
                    isConnected
                        ? disconnectFromDevice(device.id)
                        : connectToDevice(device)
                }
                style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: isConnected ? "#ef4444" : "#111827",
                }}
            >
                <Text style={{color: "white", fontWeight: "600"}}>
                    {isConnected ? "Disconnect" : "Connect"}
                </Text>
            </TouchableOpacity>
        </View>
    )
}
const CircleIcon = ({label, color}: { label: string; color?: string }) => (
    <View style={[styles.circleIcon, color ? {backgroundColor: `${color}1a`} : null]}>
        <Text style={[styles.circleIconText, color ? {color} : null]}>{label}</Text>
    </View>
);

const InfoRow = ({label, value}: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);
