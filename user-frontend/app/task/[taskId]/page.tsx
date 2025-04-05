"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { USER_BACKEND_URL } from "@/utils";
import axios from "axios";
import socket from "@/utils/socket";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TaskPage() {
    interface Option {
        id: string;
        image_url: string;
    }
    
    interface Task {
        title: string;
        done: boolean;
        options: Option[];
    }

    interface ResultCount {
        count: number;
    }
    
    interface Result {
        [optionId: string]: {
            count: number;
        };
    }

    interface TaskResponse {
        taskDetails: Task;
        result: Result;
    }   

    const { taskId } = useParams<{ taskId: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

    const fetchTask = async () => {
        try {
            const response = await axios.get<TaskResponse>(`${USER_BACKEND_URL}/task/${taskId}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setTask(response.data.taskDetails as Task);
            setResult(response.data.result as Result);

            console.log(response.data.taskDetails)
            console.log(response.data.result)
        } catch (error) {
            console.error("Error fetching task:", error);
        }
    };

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowModal(false);
            setIsClosing(false);
            setFullImageUrl(null);
        }, 300); 
    };

    useEffect(() => {
        fetchTask();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeModal();
            }
        };

        const handleNewSubmission = () => {
            console.log("Received newSubmissionCreated event, fetching updated task...");
            fetchTask();
        };

        socket.on("newSubmissionCreated", handleNewSubmission);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            socket.off("newSubmissionCreated", handleNewSubmission);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [taskId]);

    if (!task) return <p className="text-center mt-10 text-lg">Loading...</p>;

    const colors = ["#6B7280", "#3B82F6", "#1E40AF", "#93C5FD", "#64748B", "#60A5FA"];
    const dynamicColors = task.options.map((_, index: number) => colors[index % colors.length]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: 'white',
                },
            },
            tooltip: {
                bodyColor: 'white',
                titleColor: 'white',
            },
        },
        scales: {
            x: {
                ticks: {
                    color: 'white',
                },
                grid: {
                    color: 'rgba(255,255,255,0.1)',
                },
            },
            y: {
                ticks: {
                    color: 'white',
                },
                grid: {
                    color: 'rgba(255,255,255,0.1)',
                },
            },
        },
    };


    const chartData = {
        labels: task.options.map((opt) => `Option ${opt.id}`),
        datasets: [
            {
                label: "Votes",
                data: task.options.map((opt) => result?.[opt.id]?.count || 0),
                backgroundColor: dynamicColors,
                borderColor: "#1E3A8A",
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 font-sans text-white animate-fade-in">
            <div className="w-full max-w-5xl backdrop-blur-md bg-black/30 border border-white/10 shadow-xl rounded-xl p-8 text-white transition-all duration-300 hover:shadow-2xl">

                {/* Title */}
                <h1 className="text-4xl font-bold text-center text-indigo-200 drop-shadow-md">
                    {task.title}
                </h1>

                {/* Status */}
                <h3 className="text-2xl font-semibold text-center mt-4 text-slate-300">
                    Status | {task.done ? "✅ Done" : "🕐 In Progress"}
                </h3>

                {/* Options */}
                <div className="flex flex-wrap justify-center gap-4 mt-10">
                    {task.options.map((opt) => (
                        <div
                            key={opt.id}
                            className="group w-56 bg-slate-800 hover:bg-gray-500 rounded-xl border border-slate-700 p-4 flex flex-col items-center shadow-md hover:shadow-lg transition cursor-pointer"
                            onClick={() => {
                                setFullImageUrl(opt.image_url);
                                setShowModal(true);
                            }}
                        >
                            <div className="w-full h-56 bg-black/20 rounded-md flex items-center justify-center">
                                <img
                                    src={opt.image_url}
                                    alt={`Option ${opt.id}`}
                                    className="max-w-full max-h-full object-contain rounded-md px-2"
                                />
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-200">
                                Votes: {result?.[opt.id]?.count || 0}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Bar Chart */}
                <div className="mt-12 w-full max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md">
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Modal */}
            {showModal && fullImageUrl && (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <div className="relative bg-black border border-white/20 rounded-lg p-8 max-w-3xl w-[90%] max-h-[85vh] overflow-auto shadow-2xl">
            <button
                className="scale-110 absolute top-3 right-3 text-white text-xl hover:text-red-400"
                onClick={closeModal}
            >
                &times;
            </button>
            <img
                src={fullImageUrl}
                alt="Full View"
                className="w-full h-auto rounded-lg object-contain"
            />
        </div>
    </div>
)}

            {/* Animation Styles */}
            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-in-out;
                }
                .animate-fade-out {
                    animation: fadeOut 0.3s ease-in-out;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.97);
                    }
                }
            `}</style>
        </div>
    );
}
