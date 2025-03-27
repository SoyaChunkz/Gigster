"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { USER_BACKEND_URL } from "@/utils";
import socket from "@/utils/socket";

export const Dashboard = () => {

    const [tasks, setTasks] = useState([]);

    const fetchTasks = async () => {
        try {
            const response: any = await axios.get(`${USER_BACKEND_URL}/tasks`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setTasks(response.data.tasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect( () => {
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
    }, []);


    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6">📋 Task Dashboard</h1>

            {tasks.length === 0 ? (
                <p className="text-gray-400">No tasks available.</p>
            ) : (
                <div className="space-y-6">
                    {tasks.map((task, index) => (
                        <div key={index} className="p-4 bg-gray-800 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-2">🆔 Task {index + 1}</h2>

                            {/* Task Options (Images) */}
                            <div className="flex gap-4 overflow-x-auto">
                                
                                { // @ts-ignore 
                                    task.options.map((option) => (
                                        <img
                                            key={option.id}
                                            src={option.image_url}
                                            alt={`Option ${option.id}`}
                                            className="w-24 h-24 rounded-lg object-cover border-2 border-gray-700"
                                        />
                                    ))}
                            </div>

                            {/* Submissions */}
                            <div className="mt-4">
                                <h3 className="text-lg font-medium">📊 Submissions</h3>
                                {// @ts-ignore 
                                    task.submissions.length > 0 ? (
                                        <ul className="list-disc list-inside">
                                            { // @ts-ignore
                                                task.submissions.map((submission) => (
                                                    <li key={submission.id} className="text-gray-300">
                                                        Worker ID: <span className="text-white font-bold">{submission.worker_id}</span>
                                                        | Option ID: <span className="text-white font-bold">{submission.option_id}</span>
                                                        | 💰 Amount: <span className="text-green-400 font-bold">{submission.amount}</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-400">No submissions yet.</p>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}