"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { WORKER_BACKEND_URL } from "@/utils";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import { FaEye } from "react-icons/fa";

interface Task {
  id: number;
  amount: number;
  title: string;
  options: {
    id: number;
    image_url: string;
    task_id: number;
  }[];
}

export const TaskView = () => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("No tasks available. Try again later.");
  const { isSignedIn, setIsSignedIn } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  const fetchTask = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsSignedIn(false);
      return;
    }

    try {
      setMessage("Fetching next task...");
      const { data } = await axios.get<{ task: Task | null }>(
        `${WORKER_BACKEND_URL}/nextTask`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
  };

  const submitTask = async () => {
    if (!isSignedIn || !currentTask || selectedOption === null) return;
    setLoading(true);

    try {
      const { data } = await axios.post<{ nextTask: Task | null }>(
        `${WORKER_BACKEND_URL}/submission`,
        {
          taskId: currentTask.id,
          selection: selectedOption,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
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
    } catch (error: unknown ) {
      let errorMessage = "Failed to submit task.";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as any).response?.data?.message
      ) {
        errorMessage = (error as any).response.data.message;
      }
      console.log("message: ", errorMessage);
      toast.error(errorMessage);
      console.error("Error submitting task:", error);
    }

    setLoading(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsClosing(true);
      setTimeout(() => {
        setShowModal(false);
        setIsClosing(false);
      }, 300);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchTask();
  }, [isSignedIn]);

  useEffect(() => {
    if (showModal) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, handleKeyDown]);

  if (!isSignedIn) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a] text-white px-4">
      {currentTask ? (
        <div className="backdrop-blur-md bg-black/30 border border-white/10 shadow-xl rounded-xl p-6 w-full max-w-md text-white">
          <h1 className="text-2xl font-bold text-center mb-2 drop-shadow-md">
            Task #{currentTask.id}
          </h1>
          <p className="text-slate-300 text-center mb-4">{currentTask.title}</p>

          <div className="flex flex-wrap justify-center gap-4">
            {currentTask.options.map((opt) => (
              <div
                key={opt.id}
                className={`relative group cursor-pointer rounded-md p-1 border-2 transition-all duration-300 ${selectedOption === opt.id
                  ? "border-indigo-500"
                  : "border-slate-700"
                  }`}
              >
                <img
                  src={opt.image_url}
                  alt={`Option ${opt.id}`}
                  className="w-32 h-32 object-contain rounded-md"
                  onClick={() => setSelectedOption(opt.id)}
                />
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs p-1 rounded-full hover:bg-black/90"
                  onClick={() => {
                    setFullImageUrl(opt.image_url);
                    setShowModal(true);
                  }}
                >
                  <FaEye size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={submitTask}
            disabled={loading || selectedOption === null}
            className={`w-full mt-6 py-2 rounded-md text-white font-medium transition-all duration-300 ${selectedOption !== null && !loading
              ? "bg-indigo-600 hover:bg-indigo-700 shadow"
              : "bg-gray-600 cursor-not-allowed"
              }`}
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </div>
      ) : (
        <p className="text-slate-400">{message}</p>
      )}

      {/* Modal */}
      {(showModal || isClosing) && fullImageUrl && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300 ${isClosing ? "animate-fade-out" : "animate-fade-in"
            }`}
        >
          <div className="relative bg-black border border-white/20 rounded-lg p-8 max-w-3xl w-[90%] max-h-[85vh] overflow-auto shadow-2xl">
            <button
              className="scale-110 absolute top-3 right-3 text-white text-xl hover:text-red-400"
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => {
                  setShowModal(false);
                  setIsClosing(false);
                  setFullImageUrl(null);
                }, 300);
              }}
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

      <style jsx>{`
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out forwards;
  }
  .animate-fade-out {
    animation: fadeOut 0.2s ease-in-out forwards;
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
};
