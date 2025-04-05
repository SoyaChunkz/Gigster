"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.default = workerRouter;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const db_1 = require("../db");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importStar(require("bs58"));
const client_2 = require("@prisma/client");
// @ts-ignore
function workerRouter(io) {
    const router = (0, express_1.Router)();
    const prisma = new client_1.PrismaClient({
    //log: ['query', 'info', 'warn', 'error'], 
    });
    const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('devnet'), 'confirmed');
    // @ts-ignore
    router.post("/signin", (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { publicKey, encodedSignature, messageFE } = req.body;
        console.log("Received PublicKey:", publicKey);
        console.log("Received encodedSignature:", encodedSignature);
        console.log("Received message:", messageFE);
        if (!encodedSignature || !publicKey || !messageFE) {
            return res.status(400).json({ error: "Missing signature or publicKey or message" });
        }
        const decodedSignature = bs58_1.default.decode(encodedSignature);
        console.log("decodedSignature", decodedSignature);
        const messagePrefix = `Sign into Gigster\nWallet: ${publicKey === null || publicKey === void 0 ? void 0 : publicKey.toString()}\nTimestamp: `;
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
        if (Math.abs(now - timestamp) > config_1.ALLOWED_TIME_DIFF) {
            return res.status(401).json({ error: "Timestamp expired" });
        }
        const verified = tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(messageFE), decodedSignature, new web3_js_1.PublicKey(publicKey).toBytes());
        if (!verified) {
            return res.status(401).json({
                message: "Incorrect signature"
            });
        }
        const existingWorker = yield prisma.worker.findFirst({
            where: {
                address: publicKey
            }
        });
        if (existingWorker) {
            const token = jsonwebtoken_1.default.sign({
                userId: existingWorker.id
            }, config_1.WORKER_JWT_SECRET, { expiresIn: "1h" });
            return res.json({
                token,
                amount: existingWorker.pending_amount / config_1.TOTAL_DECIMALS
            });
        }
        else {
            const worker = yield prisma.worker.create({
                data: {
                    address: publicKey,
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
    router.get("/nextTask", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
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
    router.post("/submission", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        // @ts-ignore
        const userId = req.userId;
        const body = req.body;
        console.log("got raw body: ", body);
        const parsedBody = types_1.createSubmissionInput.safeParse(body);
        console.log("validated body: ", parsedBody);
        if (parsedBody.success) {
            const task = yield (0, db_1.getNextTask)(Number(userId));
            if (!task || task.id !== Number(parsedBody.data.taskId)) {
                return res.status(400).json({
                    message: "Incorrect task ID"
                });
            }
            console.log(task);
            const gigAmount = task.amount / task.contributors;
            const submission = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const submission = yield tx.submission.create({
                    data: {
                        option_id: Number(parsedBody.data.selection),
                        worker_id: Number(userId),
                        task_id: Number(parsedBody.data.taskId),
                        amount: gigAmount
                    }
                });
                yield tx.worker.update({
                    where: {
                        id: Number(userId)
                    },
                    data: {
                        pending_amount: {
                            increment: gigAmount
                        }
                    }
                });
                const submissionCount = yield tx.submission.count({
                    where: {
                        task_id: Number(parsedBody.data.taskId)
                    }
                });
                if (submissionCount >= task.contributors) {
                    yield tx.task.update({
                        where: {
                            id: Number(parsedBody.data.taskId)
                        },
                        data: {
                            done: true
                        }
                    });
                }
                return submission;
            }));
            const nextTask = yield (0, db_1.getNextTask)(Number(userId));
            console.log("submission", submission);
            console.log("next-task", nextTask);
            io.emit("newSubmissionCreated", {
                id: submission.task_id
            });
            res.json({
                nextTask,
                amount: gigAmount / config_1.TOTAL_DECIMALS
            });
        }
        else {
            res.status(411).json({
                message: "Incorrect inputs."
            });
        }
    }));
    // @ts-ignore
    router.get("/balance", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
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
    router.get("/payout", middleware_1.workerAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        // @ts-ignore
        const userid = req.userId;
        console.log("going to pay: ", userid);
        try {
            const payoutData = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const worker = yield tx.$queryRaw `
                    SELECT * FROM "Worker"
                    WHERE "id" = ${Number(userid)}
                    FOR UPDATE;
                `;
                // const worker = await tx.worker.findUnique({
                //     where: { id: Number(userid) },
                //     select: { pending_amount: true, address: true },
                // });
                console.log("got worker: ", worker[0]);
                if (!worker[0])
                    throw new Error("User not found.");
                // @ts-ignore
                if (worker.pending_amount <= 0)
                    throw new Error("No pending balance to process.");
                const existingPayout = yield tx.payouts.findFirst({
                    where: { worker_id: Number(userid),
                        status: "Processing"
                    },
                });
                if (existingPayout) {
                    console.log("Existing payout in progress. Checking transaction status...: ", existingPayout);
                    return { message: "Payout already in progress", amount: 0 };
                }
                console.log("no previous pending payouts");
                console.log("attempting to create payout log...");
                let payoutLog;
                try {
                    payoutLog = yield tx.payouts.create({
                        data: {
                            worker_id: Number(userid),
                            // @ts-ignore
                            amount: worker[0].pending_amount,
                            status: "Processing",
                        },
                    });
                    console.log("created payout log:", payoutLog);
                }
                catch (error) {
                    console.error("failed to create payout log:", error);
                    throw new Error("Database error: Unable to create payout log.");
                }
                let signature;
                try {
                    const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                        fromPubkey: new web3_js_1.PublicKey(config_1.PARENT_WALLET_ADDRESS),
                        // @ts-ignore
                        toPubkey: new web3_js_1.PublicKey(worker[0].address),
                        // @ts-ignore
                        lamports: worker[0].pending_amount,
                    }));
                    const keyPair = web3_js_1.Keypair.fromSecretKey((0, bs58_1.decode)(config_1.PARENT_WALLET_KEY));
                    signature = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [keyPair]);
                    console.log("signature is: ", signature);
                    yield tx.payouts.update({
                        where: { id: payoutLog.id },
                        data: { signature },
                    });
                    console.log("updated the log with signature");
                }
                catch (error) {
                    console.error("Transaction failed:", error);
                    yield tx.payouts.update({
                        where: { id: payoutLog.id },
                        data: { status: client_2.TxnStatus.Failure },
                    });
                    throw new Error("Transaction failed.");
                }
                yield tx.worker.update({
                    where: { id: Number(userid) },
                    data: {
                        // @ts-ignore
                        pending_amount: { decrement: worker[0].pending_amount },
                    },
                });
                console.log("updated the worker's pending amount");
                console.log("Payout Log ID:", payoutLog.id);
                yield tx.payouts.update({
                    where: { id: payoutLog.id },
                    data: { status: "Success" },
                });
                console.log("updated the log with success state");
                // @ts-ignore
                return { message: "Payout successful", amount: worker[0].pending_amount / config_1.TOTAL_DECIMALS };
            }), {
                maxWait: 5000, // Max wait time for acquiring the lock (in ms)
                timeout: 10000, // Timeout for the entire transaction (in ms)
            });
            console.log(payoutData);
            res.json(payoutData);
        }
        catch (error) {
            res.status(400).json({
                message: error || "Something went wrong."
            });
        }
    }));
    return router;
}
