"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { UploadImage } from "./UploadImage";
import { USER_BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import { useRouter } from "next/navigation";
import { FaTimes  } from "react-icons/fa";
import toast from "react-hot-toast";

export const Upload = () => {
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState<string>("");
    const [txSignature, setTxSignature] = useState<string>("0x123123");
    const router = useRouter();

    useEffect(() => {
        console.log("Updated images state:", images);
    }, [images]);

    const onSubmit = async () => {

        try {
            const response: any = await axios.post(
                `${USER_BACKEND_URL}/task`,
                {
                    options: images.map(image => ({
                        fileUrl: image,
                    })),
                    title: title || "Select the most clickable thumbnail",
                    signature: txSignature
                }, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                }
            );

            // router.push(`/task/${response.data.id}`);
        } catch (error) {
            console.error("Error submitting task:", error);
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

    const makePayment =  () => {}

  return (
    // <div className="flex justify-center">
    //     <div className="max-w-screen-lg w-full">
    //         <div className="text-2xl text-left pt-20 pl-4 w-full">
    //             Create a TASK!
    //         </div>

    //         <label className="pl-4 block mt-2 text-md font-medium">Task details</label>
            
    //         <input
    //             onChange={ (e) => {
    //                 setTitle(e.target.value);
    //             }} 
    //             type="text"
    //             id="title"
    //             className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    //             placeholder="What is your task?"
    //             required
    //         />

    //         <label className="pl-4 block mt-8 text-md font-medium text-white">
    //             Add Images
    //         </label>

    //         <div className="flex justify-center pt-4 max-w-screen-lg">
    //             {images.map(image => <UploadImage 
    //                                     image={image} 
    //                                     onImageAdded={(fileUrl) => {
    //                                         setImages(i => [...i, fileUrl]);
    //                                     }} 
    //                                   />
    //             )}
    //         </div>

    //         <div className="ml-4 pt-2 flex justify-center">
    //             <UploadImage 
    //                 onImageAdded={(fileUrl) => {
    //                     setImages(i => [...i, fileUrl]);
    //                 }} 
    //             />
    //         </div>

    //         <div className="flex justify-center">
    //             <button onClick={txSignature ? onSubmit : makePayment} type="button" className="mt-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">
    //                 {txSignature ? "Submit Task" : "Pay 0.1 SOL"}
    //             </button>
    //         </div>

    //     </div>
    // </div>

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
                    className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                >
                    {txSignature ? "Submit Task" : "Pay 0.1 SOL"}
                </button>
            </div>
        </div>
    </div>
  );
}
