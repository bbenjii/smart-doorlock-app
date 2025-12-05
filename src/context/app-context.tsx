import { createContext, ReactNode, useEffect, useRef, useState } from "react";
import { Toast } from "@/src/components/toast";
import { AppStorage } from "@/src/hooks/useAppStorage";
import { Platform } from "react-native";

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const base_url = "http://192.168.2.208:8000/";
    const [isLocked, setIsLocked] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastContent, setToastContent] = useState<{
        title: string;
        message: string;
        variant: "danger" | "success" | "info" | "warning" | "default";
    }>({
        title: "",
        message: "",
        variant: "default",
    });

    const cameraBaseUrl = "http://192.168.2.209:81";
    const isWebBrowser = Platform.OS === "web";

    const wsRef = useRef<WebSocket | null>(null);
    const previousLockState = useRef<boolean | null>(null);

    const httpLock = () => {
        const url = `${base_url}send-command/${deviceId}/LOCK`;
        return fetch(url, { method: "POST" });
    };

    const httpUnlock = () => {
        const url = `${base_url}send-command/${deviceId}/UNLOCK`;
        return fetch(url, { method: "POST" });
    };

    const httpGetLockStatus = () => {
        if (!deviceId) return;

        const url = `${base_url}status/${deviceId}`;
        return fetch(url, { method: "GET" })
            .then((response) => response.json())
            .then((data) => {
                const status = data?.status;
                if (typeof status === "string") {
                    setIsLocked(status === "LOCKED");
                }
                return data;
            })
            .catch((e) => {
                console.log("Status fetch error:", e);
            });
    };

    // Toast on lock state change
    useEffect(() => {
        if (previousLockState.current === null) {
            previousLockState.current = isLocked;
            return;
        }

        const lockedNow = isLocked;
        setToastContent({
            title: lockedNow ? "Door locked" : "Door unlocked",
            message: lockedNow ? "Front door is secured." : "Front door is now open.",
            variant: lockedNow ? "danger" : "success",
        });
        setToastVisible(true);
        previousLockState.current = lockedNow;
    }, [isLocked]);

    // Restore session once on app start
    useEffect(() => {
        const storedSession = AppStorage.getSession();
        if (storedSession?.user) {
            setUser(storedSession.user);
        }
        if (storedSession?.token) {
            setAuthToken(storedSession.token);
        }

        const fallbackDeviceId =
            storedSession?.user?.device_id || "smartlock_5C567740C86C";
        setDeviceId(fallbackDeviceId);
    }, []);

    // Single WebSocket lifecycle: only on app open + when deviceId changes
    useEffect(() => {
        if (!deviceId) return;

        const wsUrl =
            (base_url || "")
                .replace(/^http:\/\//, "ws://")
                .replace(/^https:\/\//, "wss://") + "ws/client";

        console.log("Connecting WS client to:", wsUrl);

        // Close any existing socket before opening a new one
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Client WS connected");
            const subMsg = JSON.stringify({
                type: "subscribe",
                deviceId: deviceId,
            });
            ws.send(subMsg);

            // Initial status fetch
            httpGetLockStatus();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // { type: "status", deviceId: "...", status: "LOCKED" }
                if (data.type === "status" && data.deviceId === deviceId) {
                    if (typeof data.status === "string") {
                        setIsLocked(data.status === "LOCKED");
                    }
                }
            } catch (e) {
                console.log("WS message parse error:", e);
            }
        };

        ws.onerror = (event) => {
            console.log("WS error:", event);
        };

        ws.onclose = (event) => {
            console.log("Client WS closed:", event?.code, event?.reason);
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };

        // Cleanup when deviceId changes or provider unmounts
        return () => {
            console.log("Cleaning up WS for device:", deviceId);
            if (wsRef.current === ws) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
        // We intentionally key only on deviceId so WS is created:
        // - once on initial deviceId
        // - again only if deviceId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    const signout = () => {
        AppStorage.clearSession();
        setUser(null);
        setAuthToken(null);
        setDeviceId(null);

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    const signin = async (email: string, password: string) => {
        const response = await fetch(`${base_url}auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message =
                errorBody?.detail || "Invalid credentials. Please try again.";
            throw new Error(message);
        }

        const data = await response.json();
        setUser(data.user);
        setAuthToken(data.token);
        AppStorage.setSession({ user: data.user, token: data.token });

        if (data.user?.device_id) {
            setDeviceId(data.user.device_id);
        }
    };

    const signup = async (payload: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }) => {
        const response = await fetch(`${base_url}auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message =
                errorBody?.detail || "Sign up failed. Please try again.";
            throw new Error(message);
        }

        const data = await response.json();
        setUser(data.user);
        setAuthToken(data.token);
        AppStorage.setSession({ user: data.user, token: data.token });

        if (data.user?.device_id) {
            setDeviceId(data.user.device_id);
        }
    };


    const getCameraBaseUrl = () => {
        if (!deviceId) return null;
        return `${base_url}camera/${deviceId}`;
    };

    const contextValue = {
        user,
        deviceId,
        httpLock,
        httpUnlock,
        isLocked,
        signin,
        signup,
        signout,
        authToken,
        isWebBrowser,
        cameraBaseUrl: getCameraBaseUrl()
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
            <Toast
                visible={toastVisible}
                title={toastContent.title}
                message={toastContent.message}
                variant={toastContent.variant}
                placement="top"
                offset={88}
                onDismiss={() => setToastVisible(false)}
            />
        </AppContext.Provider>
    );
};
