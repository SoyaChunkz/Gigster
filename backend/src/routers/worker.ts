import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { TOTAL_DECIMALS, WORKER_JWT_SECRET } from "../config";
import { getNextTask } from "../db";
import { workerAuthMiddleware } from "../middleware";
import { createSubmissionInput } from "../types";

const TOTAL_SUBMISSIONS: number = 100;

const router = Router();
const prisma  = new PrismaClient();


// @ts-ignore
router.post("/signin", async (req, res) => {
    
    const hardcodedWalletAddress = "8rhZMcFGQRysR6Rh5bAsKELmjSQpJVhuSVg1HVp1N36h";
    
    const existingWorker = await prisma.worker.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    });

    if (existingWorker) {
        const token = jwt.sign({
            userId: existingWorker.id
        }, WORKER_JWT_SECRET);    

        return res.json({
            token,
            amount: existingWorker.pending_amount / TOTAL_DECIMALS
        });

    } else {

        const worker = await prisma.worker.create({
            data: {
                address: hardcodedWalletAddress,
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
    const parsedBody = createSubmissionInput.safeParse(body);

    if (parsedBody.success) {
        const task = await getNextTask(Number(userId));
        if (!task || task.id !== Number(parsedBody.data.taskId)) {
            return res.status(400).json({
                message: "Incorrect task ID"
            });
        }

        const amount = task.amount / TOTAL_SUBMISSIONS;

        await prisma.$transaction(async tx => {

            await tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: Number(userId),
                    task_id: Number(parsedBody.data.taskId),
                    amount
                }
            });

            await tx.worker.update({
                where: {
                    id: Number(userId)
                },
                data: {
                    pending_amount: {
                        increment: amount
                    }
                }
            });

        });

        const nextTask = getNextTask(Number(userId));

        res.json({
            nextTask,
            amount: amount / TOTAL_DECIMALS
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
    
    try {

        const pending_amount = await prisma.$transaction(async tx => {

            await tx.worker.update({
                where: {
                    id: Number(userid)
                },
                data: {},
                select: {
                    pending_amount: true
                }
            });
    
            const worker = await tx.worker.findFirst({
                where: {
                    id: Number(userid)
                },
                select: {
                    pending_amount: true
                }
            })
        
            if (!worker) {
                throw new Error("User not found.");
            }
            
            if (worker.pending_amount <= 0) {
                throw new Error("No pending balance to process.");
            }
    
            await tx.worker.update({
                where: {
                    id: Number(userid)
                },
                data: {
                    pending_amount: {
                        decrement: worker.pending_amount
                    },
                    locked_amount: {
                        increment: worker.pending_amount
                    }
                }
            });
    
    
            await tx.payouts.create({
                data: {
                    user_id: Number(userid),
                    amount: worker.pending_amount,
                    status: "Processing",
                    signature: "signature"
                }
            });
    
            return worker.pending_amount;
        });
    
        res.json({
            message: "Processing payout.",
            amount: pending_amount
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Something went wrong.";
        res.status(400).json({
            message: errorMessage
        });
    }
});

export default router;