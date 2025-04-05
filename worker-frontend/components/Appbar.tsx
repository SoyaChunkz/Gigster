"use client"
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { WORKER_BACKEND_URL } from "@/utils";
import axios from "axios";
import { useAuth } from "./AuthContext";
import bs58 from "bs58";
import { Payout } from "./Payout";
import { jwtDecode } from "jwt-decode";

export const Appbar = ( ) => {

    type DecodedToken = {
        exp: number;
        userId: string;
    };

    const { publicKey, connected, signMessage, disconnect } = useWallet();
    const { isSignedIn, setIsSignedIn } = useAuth();
    const [prevPK, setPrevPK] = useState<string | null>(null);

    const signAndSend = async () => {

        if (isSignedIn) {
            console.log("User already signed in");
            return;
        }

        if (!publicKey) {
            console.log("Wallet not connected");
            return;
        }

        // const now = new Date();
        // const day = now.getDate().toString().padStart(2, "0");
        // const month = (now.getMonth() + 1).toString().padStart(2, "0");
        // const year = now.getFullYear();
        // const hours = now.getHours().toString().padStart(2, "0");
        // const minutes = now.getMinutes().toString().padStart(2, "0");
        // const seconds = now.getSeconds().toString().padStart(2, "0");
        // const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

        const formattedDate = new Date().toISOString(); // UTC timestamp
        const messageFE = `Sign into Gigster\nWallet: ${publicKey?.toString()}\nTimestamp: ${formattedDate}`;
        const encodedMessage = new TextEncoder().encode(messageFE);

        try {
            const signature = await signMessage?.(encodedMessage);

            // @ts-expect-error
            const encodedSignature = bs58.encode(signature);

            console.log("hitting with payload: ", publicKey.toString(), encodedSignature, messageFE);

            const response: any = await axios.post(`${WORKER_BACKEND_URL}/signin`, 
                {
                    encodedSignature,
                    publicKey: publicKey.toString(),
                    messageFE
                }
            );

            const token = response.data.token;
            localStorage.setItem("token", token);
            localStorage.setItem("prevPK", publicKey.toString());
            setPrevPK(publicKey.toString());
            setIsSignedIn(true);
            handleTokenTimeout(token);

        } catch (error) {
            console.error("Error signing message:", error);
        }
    }

    const handleTokenTimeout = (token: string) => {
        try {
            const decoded: DecodedToken = jwtDecode(token);
            const now = Date.now() / 1000;
    
            if (decoded.exp < now) {
                console.log("Token already expired.");
                localStorage.removeItem("token");
                localStorage.removeItem("prevPK");
                setIsSignedIn(false);
                return;
            }
    
            const timeUntilExpiry = (decoded.exp - now) * 1000;
            console.log(`Setting token expiration timer for ${timeUntilExpiry / 1000} seconds`);
    
            const timer = setTimeout(() => {
                console.log("Token expired (timeout), clearing...");
                localStorage.removeItem("token");
                localStorage.removeItem("prevPK");
                setIsSignedIn(false);
            }, timeUntilExpiry);
    
            return () => clearTimeout(timer);
    
        } catch (err) {
            console.error("Error decoding token:", err);
            localStorage.removeItem("token");
            localStorage.removeItem("prevPK");
            setIsSignedIn(false);
        }
    };
    
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

        if (!token && !isSignedIn && connected) {  
            console.log("1")
            signAndSend();
        }
    }, [isSignedIn, connected]); 

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
            handleTokenTimeout(token);
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
            <div className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b border-gray-700">
              {/* Left side: Logo */}
              <div className="text-2xl font-semibold text-white">
                Gigster (Worker)
              </div>
          
              {/* Right side: Payout + Wallet Buttons */}
              <div className="flex items-center gap-4">
                {isSignedIn && <Payout />}
          
                <div className="rounded-md overflow-hidden">
                  <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !text-white !font-medium !px-4 !py-2 !rounded-md" />
                </div>
                <div className="rounded-md overflow-hidden">
                  <WalletDisconnectButton
                    onClick={handleDisconnect}
                    className="!bg-red-600 hover:!bg-red-700 !text-white !font-medium !px-4 !py-2 !rounded-md"
                  />
                </div>
              </div>
            </div>
          );
}