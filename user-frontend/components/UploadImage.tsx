"use client"
import { useState, ChangeEvent } from "react";
import axios from "axios";
import { USER_BACKEND_URL, CLOUDFRONT_URL } from "../utils/index";
import { FaPlus } from "react-icons/fa";
import toast from "react-hot-toast";

export const UploadImage = ({ onImageAdded, image }: 
    { onImageAdded: (image: string) => void; 
      image?: string; 
    }) => {

        interface ResType {
            preSignedUrl: string,
            key: string
        }

        const [uploading, setUploading] = useState(false);

        async function onFileSelect(e: ChangeEvent<HTMLInputElement>) {
            try {
                
                console.log("got file")
                console.log(e.target.files)
                const file = e.target.files?.[0];
                if (!file) {
                    toast.error("No file selected.");
                    setUploading(false);
                    return;
                  }
                const response = await axios.get<ResType>(`${USER_BACKEND_URL}/preSignedUrl`, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                });

                console.log("got response: ", response)

                const presignedUrl = response.data.preSignedUrl;
                console.log("got presigned URL: ", presignedUrl)
                const fileKey = response.data.key;
                console.log("got fileKey: ", fileKey)

                // const formData = new FormData();
                // formData.set("bucket", response.data.fields["bucket"])
                // formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
                // formData.set("X-Amz-Credential", response.data.fields["X-Amz-Credential"]);
                // formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
                // formData.set("X-Amz-Date", response.data.fields["X-Amz-Date"]);
                // formData.set("key", response.data.fields["key"]);
                // formData.set("Policy", response.data.fields["Policy"]);
                // formData.set("X-Amz-Signature", response.data.fields["X-Amz-Signature"]);
                // formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
                // formData.append("file", file);

                // console.log("putting file on s3...")
                // const awsResponse = await axios.post(presignedUrl, formData);

                console.log("putting file on s3...")
                await axios.put(presignedUrl, file, {
                    headers: {
                        "Content-Type": file.type 
                    }
                });
                
                onImageAdded(`${CLOUDFRONT_URL}/${fileKey}`);

            } catch(e) {
                console.log(e)
            }

            setUploading(false);
        }

        if (image) {
            return (
                <img
                    className="p-2 w-32 h-32 object-contain rounded-lg border border-gray-600 bg-gray-700"
                    src={image}
                    alt="Uploaded"
                />
            );
        }


        return (
            // <div>
            //     <div className="w-40 h-40 rounded border text-2xl cursor-pointer">
            //         <div className="h-full flex justify-center flex-col relative w-full">
            //             <div className="h-full flex justify-center w-full pt-16 text-4xl">
            //                 {uploading ? <div className="text-sm">Loading...</div> : <>
            //                     +
            //                     <input className="bg-red-400 w-40 h-40" type="file" style={{ position: "absolute", opacity: 0, top: 0, left: 0, bottom: 0, right: 0, width: "100%", height: "100%" }} onChange={onFileSelect} />
            //                 </>}
            //             </div>
            //         </div>
            //     </div>
            // </div>

            <div className="w-32 h-32 flex items-center justify-center border border-gray-600 rounded-lg bg-gray-700 cursor-pointer relative hover:border-blue-500">
            {uploading ? (
                <span className="text-white text-sm">Uploading...</span>
            ) : (
                <>
                    <span className="text-white text-3xl font-semibold"><FaPlus/></span>
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={onFileSelect}
                    />
                </>
            )}
        </div>
        );
}