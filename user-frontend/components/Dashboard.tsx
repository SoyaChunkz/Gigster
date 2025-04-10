"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import {USER_BACKEND_URL } from "@/utils";
import socket from "@/utils/socket";
import { useAuth } from "./AuthContext";
import { FiExternalLink, FiChevronDown, FiChevronUp, FiTrash } from "react-icons/fi";
import toast from "react-hot-toast";

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

    interface DeleteTask {
      message: string
    }

    const [tasks, setTasks] = useState<Task[]>([]);
    const { isSignedIn, setIsSignedIn } = useAuth();
    const [showTasks, setShowTasks] = useState(false);
    const [expandedTask, setExpandedTask] = useState<number | null>(null);
    const [showAllSubs, setShowAllSubs] = useState<Record<number, boolean>>({}); 
    
    const fetchTasks = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setIsSignedIn(false);
            return;
        }

        try {
            const response = await axios.get<{ tasks: Task[] }>(`${USER_BACKEND_URL}/tasks`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });

            setTasks(response.data.tasks);
            console.log(response.data.tasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    const onDelete = async (taskId: string) => {
      if (!isSignedIn) return;
      const token = localStorage.getItem("token");

      if (!token) {
        setIsSignedIn(false);
        return;
      }

      try {
        const response = await axios.delete<DeleteTask>(`${USER_BACKEND_URL}/task/${taskId}`, { 
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (response.data.message) {
          fetchTasks();
          toast.success(response.data.message);
        }
      } catch (error) {
        console.error("Something went wrong")
      }
    }

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
      <div className="max-w-6xl mx-auto px-6 py-10 font-sans text-slate-200 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-md">Task Dashboard</h1>
          <button
            onClick={() => setShowTasks((prev) => !prev)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 text-sm rounded-lg transition-all shadow hover:shadow-lg flex items-center gap-2"
          >
            {showTasks ? (
              <>
                <FiChevronUp /> Hide Tasks
              </>
            ) : (
              <>
                <FiChevronDown /> Show Tasks
              </>
            )}
          </button>
        </div>

        {/* Task List */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${showTasks ? "max-h-[100%] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          {tasks.length === 0 ? (
            <p className="text-gray-400">No tasks available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {tasks.map((task) => {
                const isExpanded = expandedTask === task.id;
                const showAll = showAllSubs[task.id];
                const visibleSubs = showAll ? task.submissions : task.submissions.slice(0, 5);
                const hasMore = task.submissions.length > 5;

                return (
                  <div
                    key={task.id}
                    className="relative group bg-black/30 border border-white/10 shadow-xl rounded-xl p-6 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:bg-slate-800 flex flex-col items-center justify-between"
                  >
                    {/* Delete task Btn */}
                    <button
                      className="absolute top-5 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white hover:text-red-500"
                      onClick={() => onDelete(String(task.id))}
                      title="Delete Task"
                    >
                      <FiTrash size={18}/>
                    </button>
                    {/* Top Section */}
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2 text-indigo-200">
                        Task #{task.id}
                      </h2>
                      <p className="text-slate-400 mt-1 break-words">{task.title}</p>
                      <p className="text-sm text-gray-400 mt-2">Options: {task.options.length}</p>
                      <p className="text-sm text-gray-400">
                        Status: {task.done ? "✅ Completed" : "🕐 In Progress"}
                      </p>

                      {/* Options */}
                      {task.options.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-lg font-medium mb-2 text-slate-300">Options</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {task.options.map((option) => (
                              <div
                                key={option.id}
                                className="w-full bg-slate-800 rounded-md border border-slate-700 p-2 flex justify-center items-center"
                              >
                                <img
                                  src={option.image_url}
                                  alt={`Option ${option.id}`}
                                  className="max-h-40 w-full object-contain transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section */}
                    <div className="mt-4">
                      {/* Buttons */}
                      <div className="flex gap-3">
                        <button
                          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 text-sm rounded-md transition-all shadow hover:shadow-lg"
                          onClick={() => window.open(`/task/${task.id}`, "_blank")}
                        >
                          <FiExternalLink className="mr-1.5" /> View Task
                        </button>
                        <button
                          className="flex items-center bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 text-sm rounded-md transition-all"
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        >
                          {isExpanded ? (
                            <>
                              <FiChevronUp className="mr-1" /> Hide Submissions
                            </>
                          ) : (
                            <>
                              <FiChevronDown className="mr-1" /> Show Submissions
                            </>
                          )}
                        </button>
                      </div>

                      {/* Submissions */}
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "mt-4 opacity-100" : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="p-4 bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/10 mt-2">
                          <h3 className="text-lg font-medium mb-2 text-slate-300">Submissions</h3>
                          {task.submissions.length > 0 ? (
                            <>
                              <ul className="list-disc list-inside text-gray-400 space-y-1">
                                {visibleSubs.map((submission, idx) => (
                                  <li key={idx}>
                                    Worker {submission.worker_id} → Option {submission.option_id}
                                  </li>
                                ))}
                              </ul>
                              {hasMore && (
                                <button
                                  onClick={() =>
                                    setShowAllSubs((prev) => ({
                                      ...prev,
                                      [task.id]: !prev[task.id],
                                    }))
                                  }
                                  className="mt-2 text-indigo-400 text-sm hover:underline"
                                >
                                  {showAll ? "Show Less" : "... Show All"}
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-500">No submissions yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
}