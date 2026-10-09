import { prisma } from "./prisma";

export type AdminAction =
  | "withdrawal.paid"
  | "withdrawal.cancelled"
  | "user.suspend"
  | "user.unsuspend"
  | "user.delete"
  | "user.edit"
  | "investment.complete"
  | "investment.changePlan";

interface LogEntry {
  adminId: string;
  action: AdminAction;
  targetId?: string;
  targetType?: string;
  meta?: Record<string, unknown>;
}

/** Fire-and-forget audit log — never throws, so it can't break the main flow. */
export async function logAdminAction(entry: LogEntry): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId:    entry.adminId,
        action:     entry.action,
        targetId:   entry.targetId ?? null,
        targetType: entry.targetType ?? null,
        meta:       entry.meta ? JSON.stringify(entry.meta) : null,
      },
    });
  } catch {
    // Log failures should never surface to the user
  }
}
