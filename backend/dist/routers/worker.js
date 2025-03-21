"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const db_1 = require("../db");
const middleware_1 = require("./middleware");
const types_1 = require("../types");
const TOTAL_SUBMISSIONS = 100;
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// @ts-ignore
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardcodedWalletAddress = "8rhZMcFGQRysR6Rh5bAsKELmjSQpJVhuSVg1HVp1N36h";
    const existingWorker = yield prisma.worker.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    });
    if (existingWorker) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingWorker.id
        }, config_1.WORKER_JWT_SECRET);
        return res.json({
            token,
            amount: existingWorker.pending_amount / config_1.TOTAL_DECIMALS
        });
    }
    else {
        const worker = yield prisma.worker.create({
            data: {
                address: hardcodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: worker.id
        }, config_1.WORKER_JWT_SECRET);
        return res.json({
            token
        });
    }
}));
// @ts-ignore
router.get("/nextTask", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const task = yield (0, db_1.getNextTask)(Number(userId));
    if (!task) {
        res.status(403).json({
            message: "No more tasks left for you to review."
        });
    }
    else {
        res.json({
            task
        });
    }
}));
// @ts-ignore
router.post("/submission", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parsedBody = types_1.createSubmissionInput.safeParse(body);
    if (parsedBody.success) {
        const task = yield (0, db_1.getNextTask)(Number(userId));
        if (!task || task.id !== Number(parsedBody.data.taskId)) {
            return res.status(400).json({
                message: "Incorrect task ID"
            });
        }
        const amount = task.amount / TOTAL_SUBMISSIONS;
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: Number(userId),
                    task_id: Number(parsedBody.data.taskId),
                    amount
                }
            });
            yield tx.worker.update({
                where: {
                    id: Number(userId)
                },
                data: {
                    pending_amount: {
                        increment: amount
                    }
                }
            });
        }));
        const nextTask = (0, db_1.getNextTask)(Number(userId));
        res.json({
            nextTask,
            amount: amount / config_1.TOTAL_DECIMALS
        });
    }
    else {
        res.status(411).json({
            message: "Incorrect inputs."
        });
    }
}));
// @ts-ignore
router.get("/balance", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const worker = yield prisma.worker.findFirst({
        where: {
            id: Number(userId)
        }
    });
    if (!worker) {
        return res.status(404).json({
            message: "Worker not found."
        });
    }
    else {
        res.json({
            pendingAmount: worker.pending_amount / config_1.TOTAL_DECIMALS,
            lockedAmount: worker.locked_amount / config_1.TOTAL_DECIMALS,
        });
    }
}));
// @ts-ignore
router.get("/payout", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userid = req.userId;
    try {
        const pending_amount = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.worker.update({
                where: {
                    id: Number(userid)
                },
                data: {},
                select: {
                    pending_amount: true
                }
            });
            const worker = yield tx.worker.findFirst({
                where: {
                    id: Number(userid)
                },
                select: {
                    pending_amount: true
                }
            });
            if (!worker) {
                return res.status(403).json({
                    message: "User not found."
                });
            }
            if (worker.pending_amount <= 0) {
                return res.status(400).json({
                    message: "No pending balance to process."
                });
            }
            yield tx.worker.update({
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
            yield tx.payouts.create({
                data: {
                    user_id: Number(userid),
                    amount: worker.pending_amount,
                    status: "Processing",
                    signature: "signature"
                }
            });
            return worker.pending_amount;
        }));
        res.json({
            message: "Processing payout.",
            amount: pending_amount
        });
    }
    catch (error) {
        res.status(400).json({
            message: "Something went wrong."
        });
    }
}));
exports.default = router;
