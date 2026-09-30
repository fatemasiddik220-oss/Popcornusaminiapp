import { db } from './db.js';
import { logTransactionInMongo } from './mongoRepo.js';
import { AppTransaction, TransactionType } from '../src/types.js';

export interface ActivityLogParams {
  userId: string;
  telegramId?: string;
  type: TransactionType;
  title: string;
  amount: number;
  status?: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'ACTIVE';
  details?: string;
  createdAt?: string;
}

export async function recordActivityLog(params: ActivityLogParams): Promise<AppTransaction> {
  const tx = db.logTransaction(params);
  logTransactionInMongo({
    userId: params.userId,
    telegramId: params.telegramId,
    type: params.type,
    title: params.title,
    amount: params.amount,
    status: params.status || 'COMPLETED',
    details: params.details,
    createdAt: tx.createdAt,
  }).catch((err) => {
    console.warn('[ActivityLogger] Failed to write to MongoDB Atlas:', err?.message || err);
  });
  return tx;
}

export const activityLogger = {
  record: recordActivityLog,
};
