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
// @ts-ignore
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
    const DEFAULT_TITLE = "Select the most clickable thumbnail";
    // signin with wallet
    // @ts-ignore
    router.post("/signin", (req, res) => __awaiter(this, void 0, void 0, function* () {
        // TODO: add sign verification logic here
        const hardcodedWalletAddress = "3qfpeZW7yMV1eWNsKiM5UWcZhmRMW7gig4rRoV8biUE9";
        const existingUser = yield prisma.user.findFirst({
            where: {
                address: hardcodedWalletAddress
            }
        });
        if (existingUser) {
            const token = jsonwebtoken_1.default.sign({
                userId: existingUser.id
            }, config_1.JWT_SECRET);
            return res.json({
                token
            });
        }
        else {
            const user = yield prisma.user.create({
                data: {
                    address: hardcodedWalletAddress
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
        console.log("in presignedurl api");
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
        console.log("generated presigned URL is: " + preSignedUrl);
        console.log("imagekey is: " + fileKey);
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
            console.log(`File deleted successfully: ${fileKey}`);
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
    router.post("/task", middleware_1.userAuthMiddleware, (req, res) => __awaiter(this, void 0, void 0, function* () {
        console.log("creating new task");
        //@ts-ignore
        const userId = req.userId;
        const body = req.body;
        console.log(body);
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
        let response = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const taskResponse = yield tx.task.create({
                data: {
                    title: (_a = parsedData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                    amount: 1 * config_1.TOTAL_DECIMALS,
                    signature: parsedData.data.signature,
                    user_id: (user === null || user === void 0 ? void 0 : user.id) || userId
                }
            });
            yield tx.option.createMany({
                data: parsedData.data.options.map(x => ({
                    image_url: x.fileUrl,
                    task_id: taskResponse.id
                }))
            });
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
        // console.log("starting to get task: ", taskId)
        const taskDetails = yield prisma.task.findFirst({
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
        }
        catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }));
    return router;
}
