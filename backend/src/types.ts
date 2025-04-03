import z from "zod";

export const createTaskInput = z.object({

    options: z.array(z.object({
        fileUrl: z.string()
    })).min(2),
    title: z.string().optional(),
    signature: z.string(),
    amount: z.number(),
    contributors: z.number()
});

export const createSubmissionInput = z.object({

    taskId: z.number(),
    selection: z.number(),
});