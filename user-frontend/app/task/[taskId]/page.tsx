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
    const { taskId } = useParams();
    const [task, setTask] = useState<any>(null);
    const [result, setResult] = useState<any>(null);

    const fetchTask = async () => {
        try {
            const response: any = await axios.get(`${USER_BACKEND_URL}/task/${taskId}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setTask(response.data.taskDetails);
            setResult(response.data.result);
        } catch (error) {
            console.error("Error fetching task:", error);
        }
    };

    useEffect(() => {
        fetchTask();

        const handleNewSubmission = () => {
            console.log("Received newSubmissionCreated event, fetching updated task...");
            fetchTask();
        };

        socket.on("newSubmissionCreated", handleNewSubmission);

        return () => {
            socket.off("newSubmissionCreated", handleNewSubmission);
        };
    }, [taskId]);

    if (!task) return <p className="text-center mt-10 text-lg">Loading...</p>;

    const colors = ["#6B7280", "#3B82F6", "#1E40AF", "#93C5FD", "#64748B", "#60A5FA"];
    const dynamicColors = task.options.map((_: any, index: number) => colors[index % colors.length]);

    const chartData = {
        labels: task.options.map((opt: any) => `Option ${opt.id}`),
        datasets: [
            {
                label: "Votes",
                data: task.options.map((opt: any) => result?.[opt.id]?.count || 0),
                backgroundColor: dynamicColors,
                borderColor: "#1E3A8A",
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <h1 className="text-3xl font-bold text-center">{task.title}</h1>

            {/* Display Options */}
            <div className="flex flex-wrap justify-center gap-6 mt-6">
                {task.options.map((opt: any) => (
                    <div key={opt.id} className="border p-4 rounded-lg shadow-lg bg-gray-100">
                        <img
                            src={opt.image_url}
                            alt={`Option ${opt.id}`}
                            className="w-32 h-32 object-cover rounded-lg"
                        />
                        <p className="mt-2 text-center font-semibold text-gray-800">Votes: {result?.[opt.id]?.count || 0}</p>
                    </div>
                ))}
            </div>

            {/* Bar Chart */}
            <div className="mt-8 w-[500px] max-w-full">
                <Bar data={chartData} />
            </div>
        </div>
    );
}
