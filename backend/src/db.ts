import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNextTask = async (userId: number) => {

    const task = await prisma.task.findFirst({
        where: {
            done: false,
            submissions: {
                none: {
                    worker_id: userId
                }
            }
        },
        select: {
            id: true,
            amount: true,
            title: true,
            options: true
        }
    });

    return task;
};