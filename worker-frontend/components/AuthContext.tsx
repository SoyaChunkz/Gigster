"use client"
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

    useEffect(() => {
        console.log("Auth state updated: ", isSignedIn);
    }, [isSignedIn]);

    useEffect(() => {
        if (typeof window !== "undefined") { 
            const token = localStorage.getItem("token");
            if (token !== null) setIsSignedIn(true);
            else setIsSignedIn(false);
        }
    }, [])
    

    return (
        <AuthContext.Provider value={{ isSignedIn, setIsSignedIn }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);