import { createMMKV } from 'react-native-mmkv'
import { Platform } from 'react-native';

const storage = createMMKV();

export class AppStorage{
    static getUser(){
        const saved = storage.getString("user");
        return saved ? JSON.parse(saved) : null;
    }

    static getSession() {
        let saved  = null; 
        if (Platform.OS === 'web') {
            saved = localStorage.getItem("session");
        }
        else {
            saved = storage.getString("session");
        }

        return saved ? JSON.parse(saved) : null;
    }
    
    static setUser = (user: any) => {
        storage.set("user", JSON.stringify(user));

    }

    static setSession(session: { user: any; token: string | null; refreshToken?: string | null }) {
        if (Platform.OS === 'web') {
            localStorage.setItem("session", JSON.stringify(session));
        }
        else {
            storage.set("session", JSON.stringify(session));
        }
    }
    
    static removeUser = () => {
        storage.remove("user");
    }

    static clearSession() {
        if (Platform.OS === 'web') {
            localStorage.removeItem("session");
            localStorage.removeItem("user");

        }
        else {
            storage.remove("session");
            storage.remove("user");        }

        
    }

    static getAutoLockEnabled(): boolean | null {
        if (Platform.OS === "web") {
            const value = localStorage.getItem("auto_lock_enabled");
            if (value === null) return null;
            return value === "true";
        }

        const value = storage.getString("auto_lock_enabled");
        if (value === undefined) return null;
        return value === "true";
    }

    static setAutoLockEnabled(value: boolean) {
        if (Platform.OS === "web") {
            localStorage.setItem("auto_lock_enabled", String(value));
        } else {
            storage.set("auto_lock_enabled", String(value));
        }
    }
    
}

export function useAppStorage() {
    
    const getUser = () => {
        const saved = storage.getString("user");
        return saved ? JSON.parse(saved) : null;
    }
    
    const setUser = (user: any) => {
        storage.set("user", JSON.stringify(user));

    }
    
    return {getUser, setUser};
}
