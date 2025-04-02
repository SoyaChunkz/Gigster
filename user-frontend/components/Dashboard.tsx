"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { USER_BACKEND_URL } from "@/utils";
import socket from "@/utils/socket";
import { useAuth } from "./AuthContext";
import { FiExternalLink, FiChevronDown, FiChevronUp } from "react-icons/fi";

export const Dashboard = () => {

    interface Option {
        id: number;
        image_url: string;
    }

    interface Submission {
        worker_id: number;
        option_id: number;
    }

    interface Task {
        id: number;
        title: string;
        options: Option[];
        submissions: Submission[];
        done: boolean;
    }

    const [tasks, setTasks] = useState<Task[]>([]);
    const { isSignedIn, setIsSignedIn } = useAuth();
    const [expandedTask, setExpandedTask] = useState<number | null>(null);

    // const auth = useAuth();
    
    const fetchTasks = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setIsSignedIn(false);
            return;
        }

        try {
            const response= await axios.get(`${USER_BACKEND_URL}/tasks`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });

            // @ts-ignore
            setTasks(response.data.tasks);
            // console.log(response.data.tasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect( () => {

        console.log("dashboard isSignedIn status: ", isSignedIn);
  
        if (!isSignedIn) return;

        fetchTasks();

        const handleNewTask = () => {
            console.log("Received newTaskCreated event, fetching updated tasks...");
            fetchTasks();
        };
    
        const handleNewSubmission = () => {
            console.log("Received newSubmissionCreated event, fetching updated tasks...");
            fetchTasks();
        };

        socket.on("newTaskCreated", handleNewTask);
        socket.on("newSubmissionCreated", handleNewSubmission);

        return () => {
            socket.off("newTaskCreated", handleNewTask);
            socket.off("newSubmissionCreated", handleNewSubmission); 
        };
    }, [isSignedIn]);

    if (!isSignedIn) return null; 

    return (
        <div className="max-w-[90%] mx-auto p-6">
            <h1 className="text-4xl font-bold mb-8 text-white">Task Dashboard</h1>
    
            {tasks.length === 0 ? (
                <p className="text-gray-400">No tasks available.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task, index) => (
                        <div 
                            key={index} 
                            className="p-6 bg-gray-800 text-white rounded-lg shadow-lg"
                        >
                            <h2 className="text-xl font-semibold break-words text-white">🆔 Task {index + 1} - {task.title}</h2>
    
                            <p className="text-sm text-gray-400">Options: {task.options.length}</p>
                            <p className="text-sm text-gray-400">Status: {task.done ? "Completed" : "In Progress"}</p>

                            {/* Task Options (Images) */}
                            {task.options.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-lg font-medium">Options</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {task.options.map((option) => (
                                            <img
                                                key={option.id}
                                                src={option.image_url}
                                                alt={`Option ${option.id}`}
                                                className="w-full h-auto rounded-lg object-contain border border-gray-700"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex gap-3">
                                <button
                                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
                                    onClick={() => window.open(`/task/${task.id}`, "_blank")
                                }
                                >
                                    <FiExternalLink className="mr-2" /> View Task
                                </button>
                                <button
                                    className="flex items-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-all"
                                    onClick={() =>
                                        setExpandedTask(expandedTask === task.id ? null : task.id)
                                    }
                                >
                                    
                                    {expandedTask === task.id ? (
                                        <>
                                            <FiChevronUp className="mr-2" /> Hide Submissions
                                        </>
                                    ) : (
                                        <>
                                            <FiChevronDown className="mr-2" /> Show Submissions
                                        </>
                                    )}
                        
                                </button>
                            </div>

                            {expandedTask === task.id && (
                                <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                                    <h3 className="text-lg font-medium">Submissions</h3>
                                    {task.submissions.length > 0 ? (
                                        <ul className="list-disc list-inside text-gray-300">
                                            {task.submissions.map((submission, idx) => (
                                                <li key={idx}>
                                                    Worker {submission.worker_id} → Option {submission.option_id}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-400">No submissions yet.</p>
                                    )}
                                </div>
                            )}
    
                            {/* Submissions
                            <div className="mt-4">
                                <h3 className="text-lg font-medium">📊 Submissions</h3>
                                {// @ts-ignore 
                                task.submissions?.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                        {// @ts-ignore
                                        task.submissions.map((submission: any) => (
                                            <li key={submission.id} className="text-gray-300">
                                                Worker ID: <span className="text-white font-bold">{submission.worker_id}</span> |
                                                Option ID: <span className="text-white font-bold">{submission.option_id}</span> |
                                                💰 Amount: <span className="text-green-400 font-bold">{submission.amount}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400">No submissions yet.</p>
                                )}
                            </div> */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}