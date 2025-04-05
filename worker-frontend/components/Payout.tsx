"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { WORKER_BACKEND_URL } from "@/utils";
import { useAuth } from "./AuthContext";

export const Payout = () => {

    interface PayoutResponse {
        amount: number
    }
    interface BalanceResponse {
        pendingAmount: number
    }
    const [checkingBalance, setCheckingBalance] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [pendingAmount, setPendingAmount] = useState<number | null>(null);
    const { isSignedIn, setIsSignedIn } = useAuth();

    console.log("payout ka: ", isSignedIn)

    const fetchBalance = async () => {
        if (!isSignedIn) return;
        try {
            setCheckingBalance(true);
            const response = await axios.get<BalanceResponse>(`${WORKER_BACKEND_URL}/balance`, {
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
            setCheckingBalance(false);
        }
    };

    const initiatePayout = async () => {
        if (pendingAmount === null || pendingAmount <= 0) {
            toast.error("No pending balance available.");
            return;
        }

        try {
            setWithdrawing(true);
            toast.loading("Processing payout...");
            
            const response = await axios.get<PayoutResponse>(`${WORKER_BACKEND_URL}/payout`, {
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
            setWithdrawing(false);
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
        <div className="ml-auto flex items-center space-x-3">
            <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm transition-all shadow-sm hover:shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                onClick={fetchBalance}
                disabled={checkingBalance}
            >
                {checkingBalance ? "Checking..." : "Check Balance"}
            </button>
            <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm transition-all shadow-sm hover:shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                onClick={initiatePayout}
                disabled={withdrawing  || pendingAmount === null || pendingAmount <= 0}
            >
                {withdrawing  ? "Processing..." : "Withdraw"}
            </button>
        </div>

    );
};
