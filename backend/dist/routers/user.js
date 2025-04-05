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
exports.default = userRouter;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("../config");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
function userRouter(io) {
    const router = (0, express_1.Router)();
    const prisma = new client_1.PrismaClient();
    const s3Client = new client_s3_1.S3Client({
        credentials: {
            accessKeyId: "AKIA4I2RJUVYBNISL6ND",
            secretAccessKey: "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"
        },
        region: "us-east-1"
    });
    const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('devnet'), 'confirmed');
    // signin with wallet
    // @ts-ignore
    router.post("/signin", (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { publicKey, encodedSignature, messageFE } = req.body;
        // console.log("Received PublicKey:", publicKey);
        // console.log("Received encodedSignature:", encodedSignature);
        // console.log("Received message:", messageFE);
        if (!encodedSignature || !publicKey || !messageFE) {
            return res.status(400).json({ error: "Missing signature or publicKey or message" });
        }
        const decodedSignature = bs58_1.default.decode(encodedSignature);
        // console.log("decodedSignature", decodedSignature);
        const messagePrefix = `Sign into Gigster\nWallet: ${publicKey === null || publicKey === void 0 ? void 0 : publicKey.toString()}\nTimestamp: `;
        if (!messageFE.startsWith(messagePrefix)) {
            return res.status(400).json({ error: "Invalid message format" });
        }
        const timestampStr = messageFE.replace(messagePrefix, "").trim();
        // console.log("Extracted Timestamp:", timestampStr);
        const [datePart, timePart] = timestampStr.split("_");
        const [day, month, year] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split("-").map(Number);
        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        // console.log("Parsed Timestamp (ms):", timestamp);
        if (isNaN(timestamp)) {
            return res.status(400).json({ error: "Invalid timestamp format" });
        }
        const now = Date.now();
        // console.log("Current Time (ms):", now);
        if (Math.abs(now - timestamp) > config_1.ALLOWED_TIME_DIFF) {
            return res.status(401).json({ error: "Timestamp expired" });
        }
        const verified = tweetnacl_1.default.sign.detached.verify(new TextEncoder().encode(messageFE), decodedSignature, new web3_js_1.PublicKey(publicKey).toBytes());
        if (!verified) {
            return res.status(401).json({
                message: "Incorrect signature"
            });
        }
        const existingUser = yield prisma.user.findFirst({
            where: {
                address: publicKey
            }
        });
        if (existingUser) {
            const token = jsonwebtoken_1.default.sign({
                userId: existingUser.id
            }, config_1.JWT_SECRET, { expiresIn: "1h" });
            return res.json({
                token
            });
        }
        else {
            const user = yield prisma.user.create({
                data: {
                    address: publicKey
                }
            });
            const token = jsonwebtoken_1.default.sign({
                userId: user.id
            }, config_1.JWT_SECRET);
            return res.json({
                token
            });
        }
    }));
    // @ts-ignore
    router.get("/preSignedUrl", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        // console.log("in presignedurl api")
        // @ts-ignore
        const userId = req.userId;
        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
        const fileKey = `gigster/${userId}/${formattedDate}-image.jpg`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: "decentralised-gigster",
            Key: fileKey,
            ContentType: "image/png"
        });
        const preSignedUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, {
            expiresIn: 3600
        });
        // console.log("generated presigned URL is: " + preSignedUrl);
        // console.log("imagekey is: " + fileKey);
        return res.json({
            preSignedUrl: preSignedUrl,
            key: fileKey
        });
    }));
    // @ts-ignore
    router.delete("/deleteFile", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // @ts-ignore
            const userId = req.userId;
            // @ts-ignore
            const fileKey = req.query.fileKey;
            if (!fileKey) {
                return res.status(400).json({ error: "File key is required" });
            }
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: "decentralised-gigster",
                Key: fileKey,
            });
            yield s3Client.send(command);
            // console.log(`File deleted successfully: ${fileKey}`);
            return res.json({
                message: "File deleted successfully"
            });
        }
        catch (error) {
            return res.status(500).json({
                error: "Failed to delete file"
            });
        }
    }));
    // @ts-ignore
    router.post("/storeTxn", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // console.log("storing new txn")
            //@ts-ignore
            const userId = req.userId;
            const { signature, amountInLamports } = req.body;
            const user = yield prisma.user.findFirst({
                where: {
                    id: userId
                }
            });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            const existingTxn = yield prisma.txnStore.findFirst({
                where: { signature }
            });
            if (existingTxn) {
                return res.status(400).json({ error: "Transaction already exists" });
            }
            yield prisma.txnStore.create({
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
        }
        catch (error) {
            console.error("Error storing txn:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }));
    // @ts-ignore
    router.get("/getTxn", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // console.log("getting  txn")
            const amountInLamports = req.query.amountInLamports;
            // console.log(amountInLamports)
            if (!amountInLamports) {
                return res.status(400).json({ error: "Amount is required" });
            }
            //@ts-ignore
            const userId = req.userId;
            const user = yield prisma.user.findFirst({
                where: {
                    id: userId
                }
            });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            const txnStore = yield prisma.txnStore.findFirst({
                where: {
                    user_id: userId,
                    used: false,
                    amount: { gte: Number(amountInLamports) }
                },
                orderBy: {
                    id: "asc"
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
        }
        catch (error) {
            console.error("Error fetching txn:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }));
    // @ts-ignore
    router.post("/task", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        // console.log("creating new task")
        var _a, _b, _c, _d, _e, _f;
        //@ts-ignore
        const userId = req.userId;
        const body = req.body;
        // console.log(body)
        // input validation
        const parsedData = types_1.createTaskInput.safeParse(body);
        if (!parsedData.data) {
            return res.status(411).json({
                message: "You've sent the wrong inputs."
            });
        }
        const user = yield prisma.user.findFirst({
            where: {
                id: userId
            }
        });
        // console.log("parsed body: ", parsedData)
        const txnStore = yield prisma.txnStore.findFirst({
            where: {
                user_id: userId,
                used: false,
                amount: { gte: Number(parsedData.data.amount) }
            },
            orderBy: {
                id: "asc"
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
        const transactionDetails = yield connection.getParsedTransaction(txnSignature, "confirmed");
        // console.log("txn: ", transactionDetails)
        if (!transactionDetails)
            return res.status(411).json({
                message: "Invalid transaction signature."
            });
        const transferInstruction = transactionDetails.transaction.message.instructions.find((instr) => instr.programId.toString() === web3_js_1.SystemProgram.programId.toString());
        if (!transferInstruction)
            return res.status(411).json({
                message: "Transaction does not contain a SOL transfer."
            });
        // console.log("instruction", transferInstruction, "\n", SystemProgram.programId.toString());
        const transferredAmount = ((_b = (_a = transactionDetails.meta) === null || _a === void 0 ? void 0 : _a.postBalances[1]) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = transactionDetails === null || transactionDetails === void 0 ? void 0 : transactionDetails.meta) === null || _c === void 0 ? void 0 : _c.preBalances[1]) !== null && _d !== void 0 ? _d : 0);
        if (transferredAmount < taskAmount) {
            return res.status(411).json({
                message: "Transaction signature/amount incorrect."
            });
        }
        // console.log("to address in txn: ", transactionDetails.transaction.message.accountKeys.at(1)?.pubkey.toString());
        // console.log("to address in txn: ", PARENT_WALLET_ADDRESS);
        if (((_e = transactionDetails.transaction.message.accountKeys.at(1)) === null || _e === void 0 ? void 0 : _e.pubkey.toString()) !== config_1.PARENT_WALLET_ADDRESS) {
            return res.status(411).json({
                message: "Transaction sent to wrong address"
            });
        }
        // console.log("from address in txn: ", transactionDetails.transaction.message.accountKeys.at(0)?.pubkey.toString());
        if (((_f = transactionDetails.transaction.message.accountKeys.at(0)) === null || _f === void 0 ? void 0 : _f.pubkey.toString()) !== (user === null || user === void 0 ? void 0 : user.address)) {
            return res.status(411).json({
                message: "Transaction sent from wrong address"
            });
        }
        let response = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const taskResponse = yield tx.task.create({
                data: {
                    title: (_a = parsedData.data.title) !== null && _a !== void 0 ? _a : config_1.DEFAULT_TITLE,
                    signature: parsedData.data.signature,
                    amount: parsedData.data.amount,
                    user_id: (user === null || user === void 0 ? void 0 : user.id) || userId,
                    contributors: parsedData.data.contributors
                }
            });
            yield tx.option.createMany({
                data: parsedData.data.options.map(x => ({
                    image_url: x.fileUrl,
                    task_id: taskResponse.id
                }))
            });
            yield tx.txnStore.update({
                where: { id: txnStore.id },
                data: { used: true, amount: taskAmount, task_id: taskResponse.id }
            });
            if (remainingAmount > 0) {
                yield tx.txnStore.create({
                    data: {
                        signature: txnSignature,
                        amount: remainingAmount,
                        user_id: userId,
                        used: false
                    }
                });
            }
            return taskResponse;
        }));
        io.emit("newTaskCreated", {
            id: response.id
        });
        res.json({
            id: response.id
        });
    }));
    // @ts-ignore
    router.get("/task/:taskId", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        // @ts-ignore
        const userId = req.userId;
        const taskId = req.params.taskId;
        console.log("starting to get task: ", taskId);
        const taskDetails = yield prisma.task.findFirst({
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
        const responses = yield prisma.submission.findMany({
            where: {
                task_id: Number(taskId)
            },
            include: {
                option: true
            }
        });
        const result = {};
        taskDetails.options.forEach(option => {
            result[option.id] = {
                count: 0,
                option: {
                    imageUrl: option.image_url
                }
            };
        });
        responses.forEach(r => {
            result[r.option_id].count++;
        });
        res.json({
            result,
            taskDetails
        });
    }));
    // @ts-ignore
    router.get("/tasks", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // @ts-ignore
            const userId = req.userId;
            const tasks = yield prisma.task.findMany({
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
            console.log(tasks);
            return res.json({
                tasks
            });
        }
        catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }));
    return router;
}
