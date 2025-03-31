"use client"
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { USER_BACKEND_URL } from "@/utils";
import axios from "axios";
import { useAuth } from "./AuthContext";
import bs58 from "bs58";

export const Appbar = ( ) => {

    const { publicKey, connected, signMessage, disconnect } = useWallet();
    const { isSignedin, setIsSignedIn } = useAuth();
    const [prevPK, setPrevPK] = useState<string | null>(null);

    const signAndSend = async () => {

        if (isSignedin) {
            console.log("User already signed in");
            return;
        }

        if (!publicKey) {
            console.log("Wallet not connected");
            return;
        }

        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

        const messageFE = `Sign into Gigster\nWallet: ${publicKey?.toString()}\nTimestamp: ${formattedDate}`;
        const encodedMessage = new TextEncoder().encode(messageFE);

        try {
            const signature = await signMessage?.(encodedMessage);

            // @ts-ignore
            const encodedSignature = bs58.encode(signature);

            console.log("hitting with payload: ", publicKey.toString(), encodedSignature, messageFE);

            const response: any = await axios.post(`${USER_BACKEND_URL}/signin`, 
                {
                    // @ts-ignore
                    encodedSignature,
                    publicKey: publicKey.toString(),
                    messageFE
                }
            );

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("prevPK", publicKey.toString());
            setPrevPK(publicKey.toString());
            setIsSignedIn(true);

        } catch (error) {
            console.error("Error signing message:", error);
        }
    }
    
    useEffect(() => {
        console.log("useEffect0")
        if (typeof window !== "undefined") { 
            const ppk = localStorage.getItem("prevPK");
            if (ppk !== null) {
                setPrevPK(ppk);
                if (prevPK !== publicKey?.toString()) {
                    console.log("pk changed so sign the message")
                    signAndSend();
                }
            }
            else setPrevPK(null);
        }
    }, [])

    useEffect(() => {
        console.log("useEffect1")
        const token = localStorage.getItem("token");

        if (!token && !isSignedin && connected) {  
            console.log("1")
            signAndSend();
        }
    }, [isSignedin, connected]); 

    useEffect(() => {
        console.log("useEffect2")
        if ( prevPK !== null && prevPK !== publicKey?.toString()){
            console.log("not equal", prevPK, publicKey?.toString())
            localStorage.removeItem("token");
            setIsSignedIn(false);
            console.log("2")
            signAndSend();
        }
    }, [publicKey]);


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsSignedIn(true);
        } 
    }, []);
    
    const handleDisconnect = async () => {
        console.log("disconnecting: ", publicKey?.toString());
        await disconnect(); 
        console.log(publicKey?.toString(), "is disconnected");
        localStorage.removeItem("token"); 
        localStorage.removeItem("prevPK"); 
        setIsSignedIn(false);
        setPrevPK(null);
    };

    if (connected) {
        console.log("wallet connected");
    }
    
    return (
        <div className="flex justify-between border-b p-4 items-center">
            <div className="text-3xl font-bold">
                Gigster (Client)
            </div>
            <div className="px-4 py-2 rounded-md flex gap-3">
                <WalletMultiButton/>
                <WalletDisconnectButton onClick={handleDisconnect}/>
            </div>
        </div>
    );
}