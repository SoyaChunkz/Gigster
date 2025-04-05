import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JWT_SECRET, PARENT_WALLET_ADDRESS, DEFAULT_TITLE, ALLOWED_TIME_DIFF, ACCESS_KEY_ID, SECRET_ACCESS_KEY } from "../config";
import { userAuthMiddleware } from "../middleware";
import { createTaskInput } from "../types";
import nacl from "tweetnacl";
import { PublicKey, Connection, clusterApiUrl, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import { Server as SocketIOServer } from "socket.io";

export default function userRouter(io: SocketIOServer): Router  {

    const router = Router();
    const prisma = new PrismaClient();
    const s3Client = new S3Client({
        credentials: {
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY
        },
        region: "us-east-1"
    });
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
   

    // signin with wallet
    // @ts-ignore
    router.post("/signin", async (req, res) => {

        const { publicKey, encodedSignature, messageFE } = req.body;
        // console.log("Received PublicKey:", publicKey);
        // console.log("Received encodedSignature:", encodedSignature);
        // console.log("Received message:", messageFE);

        if (!encodedSignature || !publicKey || !messageFE) {
            return res.status(400).json({ error: "Missing signature or publicKey or message" });
        }

        const decodedSignature = bs58.decode(encodedSignature);
        // console.log("decodedSignature", decodedSignature);


        const messagePrefix = `Sign into Gigster\nWallet: ${publicKey?.toString()}\nTimestamp: `;
        if (!messageFE.startsWith(messagePrefix)) {
            return res.status(400).json({ error: "Invalid message format" });
        }

        const timestampStr = messageFE.replace(messagePrefix, "").trim();
        // console.log("Extracted Timestamp:", timestampStr);

        const [datePart, timePart] = timestampStr.split("_");
        const [day, month, year] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split("-").map(Number);

        const timestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds);
        // console.log("Parsed Timestamp (ms):", timestamp);

        if (isNaN(timestamp)) {
            return res.status(400).json({ error: "Invalid timestamp format" });
        }

        const now = Date.now();
        // console.log("Current Time (ms):", now);

        if (Math.abs(now - timestamp) > ALLOWED_TIME_DIFF) {
            return res.status(401).json({ error: "Timestamp expired" });
        }


        const verified = nacl.sign.detached.verify(
            new TextEncoder().encode(messageFE),
            decodedSignature,
            new PublicKey(publicKey).toBytes(),
        );

        if (!verified) {
            return res.status(401).json({
                message: "Incorrect signature"
            })
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                address: publicKey
            }
        });

        if (existingUser) {
            const token = jwt.sign({
                userId: existingUser.id
            }, JWT_SECRET, { expiresIn: "1h" });

            return res.json({
                token
            });

        } else {

            const user = await prisma.user.create({
                data: {
                    address: publicKey
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

        // console.log("in presignedurl api")
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

        // console.log("generated presigned URL is: " + preSignedUrl);
        // console.log("imagekey is: " + fileKey);

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
            // console.log(`File deleted successfully: ${fileKey}`);

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
    router.post("/storeTxn", userAuthMiddleware, async (req, res) => {

        try {
            // console.log("storing new txn")

            //@ts-ignore
            const userId = req.userId

            const { signature, amountInLamports } = req.body;

            const user = await prisma.user.findFirst({
                where: {
                    id: userId
                }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const existingTxn = await prisma.txnStore.findFirst({
                where: { signature }
            });

            if (existingTxn) {
                return res.status(400).json({ error: "Transaction already exists" });
            }

            await prisma.txnStore.create({
                data: {
                    signature,
                    user_id: userId,
                    used: false,
                    amount: amountInLamports
                }
            });

            return res.json({
                message: "Txn stored successfuly!"
            });

        } catch (error) {
            console.error("Error storing txn:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // @ts-ignore
    router.get("/getTxn", userAuthMiddleware, async (req, res) => {

        try {
            // console.log("getting  txn")
            
            const amountInLamports  = req.query.amountInLamports;
            // console.log(amountInLamports)
            if (!amountInLamports) {
                return res.status(400).json({ error: "Amount is required" });
            }

            //@ts-ignore
            const userId = req.userId
            
            const user = await prisma.user.findFirst({
                where: {
                    id: userId
                }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const txnStore = await prisma.txnStore.findFirst({
                where: {
                    user_id: userId,
                    used: false,
                    amount: { gte: Number(amountInLamports) }
                },
                orderBy: {
                    id : "asc"
                }
            });

            if (!txnStore) {
                return res.status(404).json({
                    message: "No unused transaction found" 
                });
            }

            const txnSignature = txnStore.signature;
            const txnAmount = txnStore.amount;
            const remainingAmount = txnAmount - Number(amountInLamports);

            if (remainingAmount > 0) {
            
                return res.json({
                    signature: txnSignature,
                    used: txnStore.used,
                    remainingAmount
                });
            }

            return res.json({
                signature: txnStore.signature,
                used: txnStore.used
            });
        } catch (error) {
            console.error("Error fetching txn:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // @ts-ignore
    router.post("/task", userAuthMiddleware, async (req, res) => {

        // console.log("creating new task")

        //@ts-ignore
        const userId = req.userId

        const body = req.body;
        // console.log(body)

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

        // console.log("parsed body: ", parsedData)

        const txnStore = await prisma.txnStore.findFirst({
            where: {
                user_id: userId,
                used: false,
                amount: { gte: Number(parsedData.data.amount) }
            },
            orderBy: {
                id : "asc"
            }
        });

        if (!txnStore) {
            return res.status(404).json({
                message: "No unused transaction found" 
            });
        }

        const txnSignature = txnStore.signature;
        const txnAmount = txnStore.amount;
        const taskAmount = parsedData.data.amount;
        const remainingAmount = txnAmount - taskAmount;

    
        const transactionDetails = await connection.getParsedTransaction(txnSignature, "confirmed");

        // console.log("txn: ", transactionDetails)

        if (!transactionDetails)
            return res.status(411).json({
                message: "Invalid transaction signature."
            });

        const transferInstruction = transactionDetails.transaction.message.instructions.find(
            (instr) => instr.programId.toString() === SystemProgram.programId.toString()
        );

        if (!transferInstruction)
            return res.status(411).json({
                message: "Transaction does not contain a SOL transfer."
            });

        // console.log("instruction", transferInstruction, "\n", SystemProgram.programId.toString());

        const transferredAmount = (transactionDetails.meta?.postBalances[1] ?? 0) - (transactionDetails?.meta?.preBalances[1] ?? 0);

        if (transferredAmount < taskAmount) {
            return res.status(411).json({
                message: "Transaction signature/amount incorrect."
            });
        }

        // console.log("to address in txn: ", transactionDetails.transaction.message.accountKeys.at(1)?.pubkey.toString());
        // console.log("to address in txn: ", PARENT_WALLET_ADDRESS);

        if (transactionDetails.transaction.message.accountKeys.at(1)?.pubkey.toString() !== PARENT_WALLET_ADDRESS) {
            return res.status(411).json({
                message: "Transaction sent to wrong address"
            });
        }

        // console.log("from address in txn: ", transactionDetails.transaction.message.accountKeys.at(0)?.pubkey.toString());

        if (transactionDetails.transaction.message.accountKeys.at(0)?.pubkey.toString() !== user?.address) {
            return res.status(411).json({
                message: "Transaction sent from wrong address"
            })
        }

        let response = await prisma.$transaction(async tx => {

            const taskResponse = await tx.task.create({
                data: {
                    title: parsedData.data.title ?? DEFAULT_TITLE,
                    signature: parsedData.data.signature,
                    amount: parsedData.data.amount,
                    user_id: user?.id || userId,
                    contributors: parsedData.data.contributors
                }
            });

            await tx.option.createMany({
                data: parsedData.data.options.map(x => ({
                    image_url: x.fileUrl,
                    task_id: taskResponse.id
                }))
            });

            await tx.txnStore.update({
                where: { id: txnStore.id },
                data: { used: true, amount: taskAmount, task_id: taskResponse.id }
            });

            if (remainingAmount > 0) {
                await tx.txnStore.create({
                    data: {
                        signature: txnSignature,
                        amount: remainingAmount,
                        user_id: userId,
                        used: false
                    }
                });
            }

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
        console.log("starting to get task: ", taskId)

        const taskDetails = await prisma.task.findFirst({
            where: {
                id: Number(taskId),
                user_id: Number(userId)
            },
            include: {
                options: true,
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
                orderBy: [
                    { done: 'asc' }, 
                    { id: 'desc' }
                ],
                select: {
                    id: true,
                    title: true,
                    options: true,
                    submissions: true,
                    done: true
                }
            });

            if (!tasks) {
                return res.status(404).json({
                    message: "No tasks for yet."
                });
            }

            console.log(tasks)

            return res.json({
                tasks
            });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }

    });

    return router;
}