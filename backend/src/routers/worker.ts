import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { TOTAL_DECIMALS, WORKER_JWT_SECRET, ALLOWED_TIME_DIFF, PARENT_WALLET_ADDRESS, PARENT_WALLET_KEY } from "../config";
import { getNextTask } from "../db";
import { workerAuthMiddleware } from "../middleware";
import { createSubmissionInput } from "../types";
import nacl from "tweetnacl";
import { PublicKey, Connection, clusterApiUrl, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58, { decode } from "bs58";
import { TxnStatus } from "@prisma/client";

// @ts-ignore
export default function workerRouter(io) {
    const router = Router();
    const prisma = new PrismaClient({  
        //log: ['query', 'info', 'warn', 'error'], 
    });
    
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    

    // @ts-ignore
    router.post("/signin", async (req, res) => {

        const { publicKey, encodedSignature, messageFE } = req.body;
        console.log("Received PublicKey:", publicKey);
        console.log("Received encodedSignature:", encodedSignature);
        console.log("Received message:", messageFE);

        if (!encodedSignature || !publicKey || !messageFE) {
            return res.status(400).json({ error: "Missing signature or publicKey or message" });
        }

        const decodedSignature = bs58.decode(encodedSignature);
        console.log("decodedSignature", decodedSignature);

        
        const messagePrefix = `Sign into Gigster\nWallet: ${publicKey?.toString()}\nTimestamp: `;
        if (!messageFE.startsWith(messagePrefix)) {
            return res.status(400).json({ error: "Invalid message format" });
        }

        const timestampStr = messageFE.replace(messagePrefix, "").trim();
        console.log("Extracted Timestamp:", timestampStr);

        const [datePart, timePart] = timestampStr.split("_");
        const [day, month, year] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split("-").map(Number);

        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        console.log("Parsed Timestamp (ms):", timestamp);

        if (isNaN(timestamp)) {
            return res.status(400).json({ error: "Invalid timestamp format" });
        }

        const now = Date.now();
        console.log("Current Time (ms):", now);

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

        const existingWorker = await prisma.worker.findFirst({
            where: {
                address: publicKey
            }
        });

        if (existingWorker) {
            const token = jwt.sign({
                userId: existingWorker.id
            }, WORKER_JWT_SECRET, { expiresIn: "1h" });

            return res.json({
                token,
                amount: existingWorker.pending_amount / TOTAL_DECIMALS
            });

        } else {

            const worker = await prisma.worker.create({
                data: {
                    address: publicKey,
                    pending_amount: 0,
                    locked_amount: 0
                }
            });

            const token = jwt.sign({
                userId: worker.id
            }, WORKER_JWT_SECRET);

            return res.json({
                token
            });
        }
    });

    // @ts-ignore
    router.get("/nextTask", workerAuthMiddleware, async (req, res) => {

        // @ts-ignore
        const userId: string = req.userId;

        const task = await getNextTask(Number(userId));

        if (!task) {
            res.status(403).json({
                message: "No more tasks left for you to review."
            });
        } else {
            res.json({
                task
            });
        }
    });

    // @ts-ignore
    router.post("/submission", workerAuthMiddleware, async (req, res) => {

        // @ts-ignore
        const userId: string = req.userId;

        const body = req.body;
        console.log("got raw body: ", body)

        const parsedBody = createSubmissionInput.safeParse(body);
        console.log("validated body: ", parsedBody)

        if (parsedBody.success) {
            const task = await getNextTask(Number(userId));
            if (!task || task.id !== Number(parsedBody.data.taskId)) {
                return res.status(400).json({
                    message: "Incorrect task ID"
                });
            }

            console.log(task);

            const gigAmount = task.amount / task.contributors;

            const submission = await prisma.$transaction(async tx => {

                const submission = await tx.submission.create({
                    data: {
                        option_id: Number(parsedBody.data.selection),
                        worker_id: Number(userId),
                        task_id: Number(parsedBody.data.taskId),
                        amount: gigAmount
                    }
                });

                await tx.worker.update({
                    where: {
                        id: Number(userId)
                    },
                    data: {
                        pending_amount: {
                            increment: gigAmount
                        }
                    }
                });

                const submissionCount = await tx.submission.count({
                    where: {
                        task_id: Number(parsedBody.data.taskId)
                    }
                });

                if (submissionCount >= task.contributors) {
                    await tx.task.update({
                        where: {
                            id: Number(parsedBody.data.taskId)
                        },
                        data: {
                            done: true
                        }
                    });
                }

                return submission;
            });

            const nextTask = await getNextTask(Number(userId));

            console.log("submission", submission)
            console.log("next-task", nextTask)

            io.emit("newSubmissionCreated", {
                id: submission.task_id
            });

            res.json({
                nextTask,
                amount: gigAmount / TOTAL_DECIMALS
            });
        } else {
            res.status(411).json({
                message: "Incorrect inputs."
            });
        }
    });

    // @ts-ignore
    router.get("/balance", workerAuthMiddleware, async (req, res) => {

        // @ts-ignore
        const userId: string = req.userId;

        const worker = await prisma.worker.findFirst({
            where: {
                id: Number(userId)
            }
        });

        if (!worker) {
            return res.status(404).json({
                message: "Worker not found."
            });
        } else {
            res.json({
                pendingAmount: worker.pending_amount / TOTAL_DECIMALS,
                lockedAmount: worker.locked_amount / TOTAL_DECIMALS,
            });
        }
    });

    // @ts-ignore
    router.get("/payout", workerAuthMiddleware, async (req, res) => {

        // @ts-ignore
        const userid: string = req.userId; 
        console.log("going to pay: ", userid);
    
        try {
            const payoutData = await prisma.$transaction(async (tx) => {

                const worker: [1] = await tx.$queryRaw`
                    SELECT * FROM "Worker"
                    WHERE "id" = ${Number(userid)}
                    FOR UPDATE;
                `

                // const worker = await tx.worker.findUnique({
                //     where: { id: Number(userid) },
                //     select: { pending_amount: true, address: true },
                // });

                console.log("got worker: ", worker[0]);
    
                if (!worker[0]) throw new Error("User not found.");
                // @ts-ignore
                if (worker.pending_amount <= 0) throw new Error("No pending balance to process.");
    
                const existingPayout = await tx.payouts.findFirst({
                    where: { worker_id: Number(userid), 
                        status: "Processing" 
                    },
                });
    
                if (existingPayout) {
                    console.log("Existing payout in progress. Checking transaction status...: ", existingPayout);
                    return { message: "Payout already in progress", amount: 0 };
                }

                console.log("no previous pending payouts")
    
                console.log("attempting to create payout log..."); 
                let payoutLog;
                try {
                    payoutLog = await tx.payouts.create({
                        data: {
                            worker_id: Number(userid),
                            // @ts-ignore
                            amount: worker[0].pending_amount,
                            status: "Processing",
                        },
                    });
                    console.log("created payout log:", payoutLog);
                } catch (error) {
                    console.error("failed to create payout log:", error);
                    throw new Error("Database error: Unable to create payout log.");
                }
    
                let signature;
                try {
                    const transaction = new Transaction().add(
                        SystemProgram.transfer({
                            fromPubkey: new PublicKey(PARENT_WALLET_ADDRESS),
                            // @ts-ignore
                            toPubkey: new PublicKey(worker[0].address),
                            // @ts-ignore
                            lamports: worker[0].pending_amount,
                        })
                    );
    
                    const keyPair = Keypair.fromSecretKey(decode(PARENT_WALLET_KEY));
    
                    signature = await sendAndConfirmTransaction(connection, transaction, [keyPair]);
    
                    console.log("signature is: ", signature)
                    await tx.payouts.update({
                        where: { id: payoutLog.id },
                        data: { signature },
                    });
                    console.log("updated the log with signature")

    
                } catch (error) {
                    console.error("Transaction failed:", error);
    
                    await tx.payouts.update({
                        where: { id: payoutLog.id },
                        data: { status: TxnStatus.Failure },
                    });
    
                    throw new Error("Transaction failed.");
                }
    
                await tx.worker.update({
                    where: { id: Number(userid) },
                    data: {
                        // @ts-ignore
                        pending_amount: { decrement: worker[0].pending_amount },
                    },
                });

                console.log("updated the worker's pending amount")
    
                console.log("Payout Log ID:", payoutLog.id);

                await tx.payouts.update({
                    where: { id: payoutLog.id },
                    data: { status: "Success" },
                });
    
                console.log("updated the log with success state")

                // @ts-ignore
                return { message: "Payout successful", amount: worker[0].pending_amount / TOTAL_DECIMALS };
            }, {
                maxWait: 5000, // Max wait time for acquiring the lock (in ms)
                timeout: 10000, // Timeout for the entire transaction (in ms)
            });
    
            console.log(payoutData)
            res.json(payoutData);
    
        } catch (error) {
            res.status(400).json({ 
                message: error || "Something went wrong." 
            });
        }
    });
    

    return router;
}