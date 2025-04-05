"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { UploadImage } from "./UploadImage";
import { USER_BACKEND_URL, CLOUDFRONT_URL, TOTAL_DECIMALS } from "@/utils";
import { FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export const Upload = () => {
    interface TxnResponse {
        signature: string;
        remainingAmount?: number;
    }

    interface TaskResponse {
        id: string;
    }

    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState<string>("");
    const [amount, setAmount] = useState<number>(0.01);
    const [contributors, setContributors] = useState<number>(5);
    const [txSignature, setTxSignature] = useState<string>("");
    const [remainingAmount, setRemainingAmount] = useState<number>();
    const [loading, setLoading] = useState<boolean>(false);
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();


    useEffect(() => {
        console.log("Updated images state:", images);
    }, [images]);

    const fetchTxn = async () => {
        try {
            const amountInLamports = amount * TOTAL_DECIMALS;
            const response = await axios.get<TxnResponse>(`${USER_BACKEND_URL}/getTxn/?amountInLamports=${amountInLamports}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            }
            );

            if (response.data) {
                setTxSignature(response.data.signature);
                if (response.data.remainingAmount) {
                    setRemainingAmount(response.data.remainingAmount);
                } else {
                    setRemainingAmount(0);
                }
                return response.data.signature;
            }
        } catch (error) {
            console.error("Error fetching txn:", error);
        }
    }

    const onSubmit = async () => {

        try {
            setLoading(true);

            const signature = await fetchTxn();

            if (!signature) {
                toast.error("No transaction found! Please make a payment first.");
                return;
            }

            const amountInLamports = amount * TOTAL_DECIMALS;

            if (amountInLamports < 10_000_000 || amountInLamports > 500_000_000) {
                toast.error("Amount must be between 0.01 and 0.5 SOL.");
                return;
            }

            if (contributors < 5 || contributors > 100) {
                toast.error("Contributors must be between 5 and 100.");
                return;
            }

            if (remainingAmount && remainingAmount > amount) {
                const message = `Please Note, there is a balance of ${remainingAmount / TOTAL_DECIMALS} with us. Difference will be still stored.`
                toast.success(message);
            }

            const response = await axios.post<TaskResponse>(
                `${USER_BACKEND_URL}/task`,
                {
                    options: images.map(image => ({
                        fileUrl: image,
                    })),
                    title: title || "Select the most clickable thumbnail",
                    signature,
                    amount: amountInLamports,
                    contributors
                }, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
            }
            );

            setImages([]);
            setTxSignature("");
            setTitle("");
            window.open(`/task/${response.data.id}`, "_blank");
            toast.success("Task created successfully!");
        } catch (error) {
            console.error("Error submitting task:", error);
        } finally {
            setLoading(false);
        }
    }

    const deleteImage = async (fileUrl: string) => {
        try {
            console.log(fileUrl);
            const fileKey = fileUrl.replace(`${CLOUDFRONT_URL}/`, "");
            console.log(fileKey);
            await axios.delete(`${USER_BACKEND_URL}/deleteFile?fileKey=${fileKey}`
                , {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                });

            setImages(prevImages => {
                const updatedImages = prevImages.filter(img => img !== fileUrl);
                console.log("Filtered images:", updatedImages);
                return updatedImages;
            });


            toast.success("Image deleted successfully!");
        } catch (error) {
            console.error("Failed to delete image:", error);
            toast.error("Failed to delete image.");
        }
    };

    const makePayment = async () => {

        try {
            if (await fetchTxn()) {
                toast.success("Using previous unused transaction.");
                return;
            }

            if (!publicKey) {
                toast.error("Wallet not connected!");
                return;
            }
            setLoading(true);

            const amountInLamports = amount * TOTAL_DECIMALS;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey!,
                    toPubkey: new PublicKey("E5NpEGWMaqdbB91QbKq5CWHwtDfV1caxQeTAQAGPqeHy"),
                    lamports: amountInLamports
                })
            );

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight },
            } = await connection.getLatestBlockhashAndContext();

            const signature = await sendTransaction(transaction, connection, { minContextSlot });

            const confirmation = await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

            if (!confirmation) {
                throw new Error("Transaction confirmation failed");
            }

            console.log("txn: ", confirmation);

            const response = await axios.post<{ message: string }>(
                `${USER_BACKEND_URL}/storeTxn`,
                {
                    signature,
                    amountInLamports
                }, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            }
            );

            if (response.data.message === "Txn stored successfuly!") {
                setTxSignature(signature);
                toast.success(`Payment of ${amount} SOL successful! \nKindly submit your task.`)
            }
        } catch (error) {
            console.error("Payment failed:", error);
            toast.error("Transaction failed. Please try again.");
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="flex justify-center bg-gray-900 min-h-screen p-6">
            <div className="max-w-2xl w-full bg-gray-800 p-6 rounded-lg shadow-lg">
                <h1 className="text-3xl text-white font-semibold">Create a Task</h1>

                {/* Task Title Input */}
                <label className="block mt-4 text-md font-medium text-gray-300">Task details</label>
                <input
                    onChange={(e) => setTitle(e.target.value)}
                    type="text"
                    className="mt-2 w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What is your task?"
                />

                {/* Amount & Contributors Section */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    {/* Amount Input */}
                    <div className="w-full">
                        <label className="block text-md font-medium text-gray-300">Amount (SOL)</label>
                        <input
                            type="number"
                            min="0.01"
                            max="0.5"
                            step="0.01"
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="mt-2 w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter amount (0.01 - 0.5 SOL)"
                        />
                        <p className="text-xs text-gray-400 mt-1">Min: 0.01 SOL | Max: 0.5 SOL</p>
                    </div>

                    {/* Contributors Input */}
                    <div className="w-full">
                        <label className="block text-md font-medium text-gray-300">Contributors</label>
                        <input
                            type="number"
                            min="5"
                            max="100"
                            step="1"
                            onChange={(e) => setContributors(parseInt(e.target.value))}
                            className="mt-2 w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter contributors (5 - 100)"
                        />
                        <p className="text-xs text-gray-400 mt-1">Min: 5 | Max: 100</p>
                    </div>
                </div>

                {/* Image Upload Section */}
                <label className="block mt-6 text-md font-medium text-gray-300">Add Images</label>
                <div className="flex flex-wrap gap-4 justify-center pt-4">
                    {images.map((image, index) => (
                        <div key={index} className="relative group">
                            <UploadImage
                                image={image}
                                onImageAdded={(fileUrl) => setImages(i => [...i, fileUrl])}
                            />

                            {/* Delete Button */}
                            <button
                                className="absolute top-1 right-1 bg-gray-900 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                                onClick={() => deleteImage(image)}
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Upload Button */}
                <div className="flex justify-center mt-4">
                    <UploadImage onImageAdded={(imageUrl) => setImages([...images, imageUrl])} />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center mt-6">
                    <button
                        onClick={txSignature ? onSubmit : makePayment}
                        disabled={loading}
                        className={`px-6 py-3 text-white rounded-lg font-medium transition ${loading
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {loading
                            ? "Processing..."
                            : txSignature
                                ? "Submit Task"
                                : `Pay ${amount} SOL`}
                    </button>
                </div>
            </div>
        </div>
    );
}
