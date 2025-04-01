"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { WORKER_BACKEND_URL } from "@/utils";
import { useAuth } from "./AuthContext";

export const Payout = () => {
    const [loading, setLoading] = useState(false);
    const [pendingAmount, setPendingAmount] = useState<number | null>(null);
    const { isSignedIn, setIsSignedIn } = useAuth();

    console.log("payout ka: ", isSignedIn)

    const fetchBalance = async () => {
        if (!isSignedIn) return;
        try {
            setLoading(true);
            const response: any = await axios.get(`${WORKER_BACKEND_URL}/balance`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            if (response.data.pendingAmount > 0) {
                setPendingAmount(response.data.pendingAmount);
                toast.success(`Pending balance: ${response.data.pendingAmount} SOL`);
            } else {
                setPendingAmount(0);
                toast.error("No pending balance to process.");
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            toast.error("Failed to fetch balance.");
        } finally {
            setLoading(false);
        }
    };

    const initiatePayout = async () => {
        if (pendingAmount === null || pendingAmount <= 0) {
            toast.error("No pending balance available.");
            return;
        }

        try {
            setLoading(true);
            toast.loading("Processing payout...");
            
            const response: any = await axios.get(`${WORKER_BACKEND_URL}/payout`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            toast.dismiss();
            toast.success(`Payout of ${response.data.amount} SOL is successful.`);
            setPendingAmount(0);
        } catch (error) {
            toast.dismiss();
            console.error("Error processing payout:", error);
            toast.error("Payout failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("in payout useEffect")
        if (isSignedIn) {
            console.log("fetching balance...")
            fetchBalance();
        }
    }, [isSignedIn]);

    if (!isSignedIn) return <p>mkc</p>;

    return (
        <div className="flex items-center space-x-4">
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                onClick={fetchBalance}
                disabled={loading}
            >
                {loading ? "Checking..." : "Check Balance"}
            </button>
            <button
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
                onClick={initiatePayout}
                disabled={loading || pendingAmount === null || pendingAmount <= 0}
            >
                {loading ? "Processing..." : "Withdraw"}
            </button>
        </div>
    );
};
