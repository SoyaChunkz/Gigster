"use client"
import { useEffect, useState } from "react";
import axios from "axios";
import { WORKER_BACKEND_URL } from "@/utils"

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

    const fetchTask = async () => {
        try {
            setMessage("Fetching next task...");
            const response = await axios.get(`${WORKER_BACKEND_URL}/nextTask`
            , {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
            });

            // @ts-ignore
            if (response.data.task) {
                // @ts-ignore
                setCurrentTask(response.data.task);
                setSelectedOption(null);
            } else {
                setCurrentTask(null);
                setMessage("No tasks available. Try again later.");
            }
        } catch (error) {
            setCurrentTask(null);
            setMessage("No tasks available. Try again later.");
        }
    }

    const submitTask = async () => {

        if (!currentTask || selectedOption === null) return;

        setLoading(true);

        try {
            const response: any = await axios.post(`${WORKER_BACKEND_URL}/submission`
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

            // @ts-ignore
            if (response.data.nextTask == null) {
                setCurrentTask(null);
                setMessage("No tasks available. Try again later.")
            } else {
                setCurrentTask(response.data.nextTask);
            }
            setSelectedOption(null);
        } catch (error) {
            console.error("Error submitting task:", error);
        }
        setLoading(false);
    }

    useEffect( () =>     {
        fetchTask();
      }, []);

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
                                className={`cursor-pointer border-2 rounded-lg p-2 ${selectedOption === opt.id ? "border-blue-500" : "border-gray-300"
                                    }`}
                                onClick={() => setSelectedOption(opt.id)}
                            >
                                <img src={opt.image_url} alt={String(opt.id)} className="w-32 h-32 object-cover rounded-md text-black" />
                            </div>
                        ))}
                    </div>
                    <button
                        className={`w-full mt-4 p-2 rounded-md text-white ${selectedOption !== null ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"
                            }`}
                        onClick={submitTask}
                        disabled={loading || selectedOption === null}
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </div>
            ) : (
                <p className="text-gray-500">{message}</p>
            )}
        </div>
    );
}