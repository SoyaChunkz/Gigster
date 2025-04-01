"use client"
import { useEffect, useState } from "react";
import axios from "axios";
import { WORKER_BACKEND_URL } from "@/utils"
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface Task {
    id: number,
    amount: number,
    title: string,
    options: {
        id: number,
        image_url: string,
        task_id: number
    }[]
}

export const TaskView = () => {
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("No tasks available. Try again later.");
    const { isSignedIn, setIsSignedIn } = useAuth();

    const fetchTask = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setIsSignedIn(false);
            return;
        }

        try {
            setMessage("Fetching next task...");
            const { data } = await axios.get<{ task: Task | null }>(`${WORKER_BACKEND_URL}/nextTask`
            , {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
            });

            if (data.task) {
                setCurrentTask(data.task);
                setSelectedOption(null);
            } else {
                setCurrentTask(null);
                setMessage("No tasks available. Try again later.");
            }
        } catch (error) {
            console.error("Error fetching task:", error);
            setCurrentTask(null);
            setMessage("No tasks available. Try again later.");
        }
    }

    const submitTask = async () => {

        if (!isSignedIn) return;

        if (!currentTask || selectedOption === null) return;

        setLoading(true);

        try {
            const { data } = await axios.post<{ nextTask: Task | null }>(`${WORKER_BACKEND_URL}/submission`
                , {
                    taskId : currentTask.id,
                    selection : selectedOption
                }
                , {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            if (data.nextTask) {
                setCurrentTask(data.nextTask);
                toast.success("Task submitted successfully!");
            } else {
                setCurrentTask(null);
                setMessage("No tasks available. Try again later.");
                toast("No more tasks available.");
            }    
            setSelectedOption(null);
        } catch (error) {
            // @ts-ignore
            const errorMessage = error.response?.data?.message || "Failed to submit task.";
            console.log("message: ", errorMessage)
            toast.error(errorMessage);
            console.error("Error submitting task:", error);
        }
        setLoading(false);
    }

    useEffect( () => {
        console.log("taskview useAuth() output:", isSignedIn);
  
        if (!isSignedIn) return;
        fetchTask();
      }, [isSignedIn]);

    if (!isSignedIn) return null;

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            
            {currentTask ? (
                <div className="bg-white shadow-lg p-6 rounded-lg w-[400px]">
                    <h1 className="text-xl text-black font-bold text-center mb-4">{currentTask.id}</h1>
                    <h1 className="text-xl text-black font-bold text-center mb-4">{currentTask.title}</h1>
                    <div className="flex flex-wrap gap-4 justify-center">
                        {currentTask.options.map((opt) => (
                            <div
                                key={opt.id}
                                className={`cursor-pointer border-2 rounded-lg p-2 ${
                                    selectedOption === opt.id ? "border-blue-500" : "border-gray-300"
                                }`}
                                onClick={() => setSelectedOption(opt.id)}
                            >
                                <img
                                    src={opt.image_url}
                                    alt={String(opt.id)}
                                    className="w-32 h-32 object-cover rounded-md text-black"
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        className={`w-full mt-4 p-2 rounded-md text-white ${
                            selectedOption !== null && !loading
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-gray-400 cursor-not-allowed"
                        }`}
                        onClick={submitTask}
                        disabled={loading || selectedOption === null}
                    >
                        {loading ? "Processing..." : "Submit"}
                    </button>
                </div>
            ) : (
                <p className="text-gray-500">{message}</p>
            )}
        </div>
    );
}