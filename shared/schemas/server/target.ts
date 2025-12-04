import { z } from "zod";
import type { targets } from "~~/server/db/schema";

export const TargetConfigSchema = z.object({
    CommandConfigSchema: z
        .object({
            /**
             * 是否启用
             */
            enabled: z.boolean().default(false),

            /**
             * 权限
             * 当前适配器和对应目标的权限
             */
            permissions: z.array(z.string()).default([]),

            /**
             * 执行指令前缀
             */
            prefix: z.string().default("/")
        })
        .default({
            enabled: false,
            permissions: [],
            prefix: "/"
        }),

    chatSyncConfigSchema: z
        .object({
            /**
             * 是否启用聊天同步
             */
            enabled: z.boolean().default(false)
        })
        .default({
            enabled: false
        }),

    NotifyConfigSchema: z
        .object({
            /**
             * 是否启用聊天同步
             */
            enabled: z.boolean().default(false)
        })
        .default({
            enabled: false
        })
});

export type TargetConfig = z.infer<typeof TargetConfigSchema>;

export type targetSchema = typeof targets.$inferSelect;

export const targetSchemaRequest = z.object({
    targetId: z.string().default(""),
    type: z.enum(["group", "private"]).default("group"),
    enabled: z.boolean().default(true),
    config: TargetConfigSchema.nullish()
});

export const batchSameDataSchema = z.object({
    ids: z.array(z.string()).nonempty(),
    data: targetSchemaRequest
});

export const batchIdsSchema = z.object({
    ids: z.array(z.string()).nonempty()
});

export const batchDifferentDataSchema = z.object({
    items: z
        .array(
            z.object({
                id: z.string().min(1, "缺少目标ID"),
                data: targetSchemaRequest
            })
        )
        .nonempty("至少需要一条更新项")
});

export const bulkCreateSchema = z.array(targetSchemaRequest).nonempty();

export type targetSchemaRequestType = z.infer<typeof targetSchemaRequest>;
