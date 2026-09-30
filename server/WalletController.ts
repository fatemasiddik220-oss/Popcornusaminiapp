import { Request, Response } from 'express';
import { db } from './db.js';
import { getTransactionsFromMongo } from './mongoRepo.js';
import { AppTransaction } from '../src/types.js';

export const WalletController = {
  /**
   * GET /api/wallet/history and /api/wallet/transactions
   */
  getHistory: async (req: Request, res: Response) => {
    try {
      const headerTgId = (req.headers['x-telegram-id'] as string) || '';
      const queryTgId = (req.query.telegramId as string) || (req.query.telegram_id as string) || '';
      const headerUserId = (req.headers['x-user-id'] as string) || '';
      const queryUserId = (req.query.userId as string) || '';
      const targetId = headerTgId || queryTgId || headerUserId || queryUserId;

      if (!targetId) {
        return res.json({ success: true, history: [], transactions: [] });
      }

      const user = db.getUser(targetId);
      const effectiveTgId = user?.telegramId || targetId.replace(/^usr-/, '');
      const effectiveUserId = user?.id || `usr-${effectiveTgId}`;

      const mongoLogs: AppTransaction[] = await getTransactionsFromMongo(effectiveTgId);
      const memoryLogs: AppTransaction[] = [
        ...db.getTransactions(effectiveUserId),
        ...db.getTransactions(effectiveTgId),
      ];

      const deduplicated: AppTransaction[] = [];
      const seenFingerprints = new Set<string>();
      const seenIds = new Set<string>();

      const allCandidateLogs = [...mongoLogs, ...memoryLogs];
      allCandidateLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      for (const tx of allCandidateLogs) {
        if (!tx) continue;
        const timeBucket = Math.floor(new Date(tx.createdAt).getTime() / 10000);
        const fingerprint = `${tx.type}_${tx.title}_${Number(tx.amount).toFixed(2)}_${timeBucket}`;
        if (!seenFingerprints.has(fingerprint) && !seenIds.has(tx.id)) {
          seenFingerprints.add(fingerprint);
          seenIds.add(tx.id);
          deduplicated.push(tx);
        }
      }

      let history = deduplicated;

      if (history.length === 0 && user) {
        const initTx: AppTransaction = {
          id: `tx-init-${effectiveTgId}`,
          userId: user.id,
          telegramId: user.telegramId,
          type: 'TASK_REWARD',
          title: 'Account Initialized',
          amount: 0,
          status: 'COMPLETED',
          createdAt: user.createdAt || new Date().toISOString(),
          details: 'POP Miner wallet and account registered',
        };
        history.push(initTx);
      }

      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        success: true,
        history,
        transactions: history,
      });
    } catch (err: any) {
      console.warn('[WalletController] getHistory error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch history' });
    }
  },
};
