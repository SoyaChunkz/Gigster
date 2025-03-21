import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { userAuthMiddleware } from "../middleware";
import { createTaskInput } from "../types";


const router = Router();
const prisma  = new PrismaClient();
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

    const existingUser = await prisma .user.findFirst({
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

        const user = await prisma .user.create({
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

    // @ts-ignore
    const userId: string =  req.userId;

    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

    const imageKey = `gigster/${userId}/${formattedDate}-image.jpg`;

    const command = new PutObjectCommand({
        Bucket: "decentralised-gigster",
        Key: imageKey,
        ContentType: "image/png"
    });

    const preSignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600
    });

    console.log("generated presigned URL is " + preSignedUrl);

    return res.json({
        preSignedUrl
    });

})

// @ts-ignore
router.post("/task", userAuthMiddleware, async (req, res) => {

    //@ts-ignore
    const userId = req.userId

    const body = req.body;

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

    let response = await prisma.$transaction( async tx => {

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
                image_url: x.imageUrl,
                task_id: taskResponse.id
            }))
        });

        return taskResponse;
    });

    res.json({
        id: response.id
    })
});

// @ts-ignore
router.get("/task", userAuthMiddleware, async (req, res) => {

    // @ts-ignore
    const userId: string = req.userId;

    // @ts-ignore
    const taskId: string = req.query.taskId;

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

export default router;