"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { UploadImage } from "./UploadImage";
import { USER_BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import { FaTimes  } from "react-icons/fa";
import toast from "react-hot-toast";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useWallet, useConnection  } from "@solana/wallet-adapter-react";

export const Upload = () => {
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState<string>("");
    const [txSignature, setTxSignature] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();


    useEffect(() => {
        console.log("Updated images state:", images);
    }, [images]);

    const fetchTxn = async () => {
        try {
            const response: any = await axios.get(`${USER_BACKEND_URL}/getTxn`, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            if (response.data.signature) {
                setTxSignature(response.data.signature);
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
            
            const response: any = await axios.post(
                `${USER_BACKEND_URL}/task`,
                {
                    options: images.map(image => ({
                        fileUrl: image,
                    })),
                    title: title || "Select the most clickable thumbnail",
                    signature
                }, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                }
            );

            window.open(`/task/${response.data.id}`, "_blank");
            setImages([]);
            setTxSignature("");
            setTitle("");
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
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey!,
                    toPubkey: new PublicKey("E5NpEGWMaqdbB91QbKq5CWHwtDfV1caxQeTAQAGPqeHy"),
                    lamports: 100000000
    
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
    
            const response: any = await axios.post(
                `${USER_BACKEND_URL}/storeTxn`,
                {
                    signature
                }, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }           
                }
            );

            if (response.data.message === "Txn stored successfuly!") {
                setTxSignature(signature);
                toast.success("Payment of 0.1 SOL successful! \nKindly submit your task.")
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
                            className="absolute top-2 right-2 bg-gray-900 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            onClick={() => deleteImage(image)}
                        >
                            <FaTimes size={16} />
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
                    className={`px-6 py-3 text-white rounded-lg font-medium transition ${
                        loading
                            ? "bg-gray-500 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {loading
                            ? "Processing..."
                            : txSignature
                            ? "Submit Task"
                            : "Pay 0.1 SOL"}
                </button>
            </div>
        </div>
    </div>
  );
}
