import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { userAuthMiddleware } from "../middleware";
import { createTaskInput } from "../types";

// @ts-ignore
export default function userRouter(io) {
    const router = Router();
    const prisma = new PrismaClient();
    const s3Client = new S3Client({
        credentials: {
            accessKeyId: "AKIA4I2RJUVYBNISL6ND",
            secretAccessKey: "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"
        },
        region: "us-east-1"
    });
    const DEFAULT_TITLE = "Select the most clickable thumbnail";

    // signin with wallet
    // @ts-ignore
    router.post("/signin", async (req, res) => {

        // TODO: add sign verification logic here
        const hardcodedWalletAddress = "3qfpeZW7yMV1eWNsKiM5UWcZhmRMW7gig4rRoV8biUE9";

        const existingUser = await prisma.user.findFirst({
            where: {
                address: hardcodedWalletAddress
            }
        });

        if (existingUser) {
            const token = jwt.sign({
                userId: existingUser.id
            }, JWT_SECRET);

            return res.json({
                token
            });

        } else {

            const user = await prisma.user.create({
                data: {
                    address: hardcodedWalletAddress
                }
            });

            const token = jwt.sign({
                userId: user.id
            }, JWT_SECRET);

            return res.json({
                token
            });
        }
    });

    // @ts-ignore
    router.get("/preSignedUrl", userAuthMiddleware, async (req, res) => {

        console.log("in presignedurl api")
        // @ts-ignore
        const userId: string = req.userId;

        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

        const fileKey = `gigster/${userId}/${formattedDate}-image.jpg`;

        const command = new PutObjectCommand({
            Bucket: "decentralised-gigster",
            Key: fileKey,
            ContentType: "image/png"
        });

        const preSignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600
        });

        console.log("generated presigned URL is: " + preSignedUrl);
        console.log("imagekey is: " + fileKey);

        return res.json({
            preSignedUrl: preSignedUrl,
            key: fileKey
        });

    });

    // @ts-ignore
    router.delete("/deleteFile", userAuthMiddleware, async (req, res) => {

        try {
            // @ts-ignore
            const userId: string = req.userId as string;
            // @ts-ignore
            const fileKey: string = req.query.fileKey;

            if (!fileKey) {
                return res.status(400).json({ error: "File key is required" });
            }

            const command = new DeleteObjectCommand({
                Bucket: "decentralised-gigster",
                Key: fileKey,
            });

            await s3Client.send(command);
            console.log(`File deleted successfully: ${fileKey}`);

            return res.json({
                message: "File deleted successfully"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Failed to delete file"
            });
        }
    });

    // @ts-ignore
    router.post("/task", userAuthMiddleware, async (req, res) => {

        console.log("creating new task")

        //@ts-ignore
        const userId = req.userId

        const body = req.body;
        console.log(body)

        // input validation
        const parsedData = createTaskInput.safeParse(body);

        if (!parsedData.data) {
            return res.status(411).json({
                message: "You've sent the wrong inputs."
            });
        }

        const user = await prisma.user.findFirst({
            where: {
                id: userId
            }
        });

        let response = await prisma.$transaction(async tx => {

            const taskResponse = await tx.task.create({
                data: {
                    title: parsedData.data.title ?? DEFAULT_TITLE,
                    amount: 1 * TOTAL_DECIMALS,
                    signature: parsedData.data.signature,
                    user_id: user?.id || userId
                }
            });

            await tx.option.createMany({
                data: parsedData.data.options.map(x => ({
                    image_url: x.fileUrl,
                    task_id: taskResponse.id
                }))
            });

            return taskResponse;
        });

        io.emit("newTaskCreated", {
            id: response.id
        });

        res.json({
            id: response.id
        })
    });

    // @ts-ignore
    router.get("/task/:taskId", userAuthMiddleware, async (req, res) => {

        // @ts-ignore
        const userId: string = req.userId; 

        const taskId: string = req.params.taskId;
        // console.log("starting to get task: ", taskId)

        const taskDetails = await prisma.task.findFirst({
            where: {
                id: Number(taskId),
                user_id: Number(userId)
            },
            include: {
                options: true
            }
        });

        if (!taskDetails) {
            return res.status(403).json({
                message: "You don't have access to this task."
            });
        }

        const responses = await prisma.submission.findMany({
            where: {
                task_id: Number(taskId)
            },
            include: {
                option: true
            }
        });

        const result: Record<string, {
            count: number,
            option: {
                imageUrl: string
            }
        }> = {};

        taskDetails.options.forEach(option => {
            result[option.id] = {
                count: 0,
                option: {
                    imageUrl: option.image_url
                }
            }
        });

        responses.forEach(r => {
            result[r.option_id].count++;
        });

        res.json({
            result,
            taskDetails
        });
    });

    // @ts-ignore
    router.get("/tasks", userAuthMiddleware, async (req, res) => {

        try {
            // @ts-ignore
            const userId: string = req.userId;

            const tasks = await prisma.task.findMany({
                where: {
                    user_id: Number(userId)
                },
                select: {
                    options: true,
                    submissions: true
                }
            });

            if (!tasks) {
                return res.status(404).json({
                    message: "No tasks for yet."
                });
            }

            return res.json({
                tasks
            });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }

    });

    return router;
}