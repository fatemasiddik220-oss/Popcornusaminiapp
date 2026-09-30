import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { telegramBot } from './bot.js';
import { isMongoConnected } from './mongoose.js';
import { findUserByReferralCodeInMongo, syncUserToMongo } from './mongoRepo.js';

function getClientInfo(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
  const ua = (req.headers['user-agent'] as string) || 'unknown_ua';
  const clientFp = (req.headers['x-device-fingerprint'] as string) || '';
  const tgPlatform = (req.headers['x-telegram-platform'] as string) || '';
  const compositeKey = `${ip}::${ua}::${clientFp}::${tgPlatform}`;
  const deviceHash = crypto.createHash('sha256').update(compositeKey).digest('hex').slice(0, 32);
  const fingerprint = `dfp_${deviceHash}`;
  return { ip, fingerprint };
}

export class UserInitController {
  /**
   * POST /api/user/init, /api/user/register, /api/auth
   */
  public static async initUser(req: Request, res: Response): Promise<void> {
    try {
      const { ip, fingerprint } = getClientInfo(req);
      const { initData, referrerId, devUser } = req.body || {};
      let telegramUser: any = null;
      let extractedStartParam: string | null = null;

      if (initData && typeof initData === 'string') {
        try {
          const urlParams = new URLSearchParams(initData);
          const userStr = urlParams.get('user');
          if (userStr) {
            telegramUser = JSON.parse(userStr);
          }
          extractedStartParam =
            urlParams.get('start_param') ||
            urlParams.get('startParam') ||
            urlParams.get('startapp') ||
            urlParams.get('start');
        } catch (e) {
          console.warn('[UserInitController] Failed to parse initData JSON:', e);
        }
      }

      if (!telegramUser) {
        const headerId = req.headers['x-telegram-id'] as string;
        const headerUser = req.headers['x-telegram-username'] as string;
        const headerFirst = req.headers['x-telegram-first-name'] as string;
        if (headerId) {
          telegramUser = {
            id: headerId,
            username: headerUser || `user_${headerId.slice(-4)}`,
            first_name: headerFirst ? decodeURIComponent(headerFirst) : 'POP Miner',
          };
        } else if (devUser && devUser.telegramId) {
          telegramUser = {
            id: devUser.telegramId,
            username: devUser.username || `user_${String(devUser.telegramId).slice(-4)}`,
            first_name: devUser.firstName || 'POP Miner',
          };
        }
      }

      if (!telegramUser) {
        telegramUser = {
          id: 998811223,
          username: 'pop_ton_explorer',
          firstName: 'POP',
          lastName: 'Pioneer',
        };
      }

      const currentTgId = String(telegramUser.id).trim();
      const currentUsername = telegramUser.username ? String(telegramUser.username).toLowerCase().trim() : '';

      const existingUser = db.getUser(currentTgId);

      if (existingUser) {
        if (telegramUser.username) existingUser.username = telegramUser.username;
        if (telegramUser.first_name) existingUser.firstName = telegramUser.first_name;
        existingUser.ipAddress = ip;
        existingUser.deviceFingerprint = fingerprint;

        if (existingUser.referrerId) {
          const parent = db.getUser(existingUser.referrerId);
          if (parent && (parent.referrerId === existingUser.telegramId || parent.referrerId === existingUser.id)) {
            console.warn(`[UserInitController] Broken legacy circular referral loop between ${existingUser.telegramId} and ${parent.telegramId}`);
            parent.referrerId = null;
            db.saveUser(parent);
            syncUserToMongo(parent).catch(() => {});
          }
        }
        db.saveUser(existingUser);
        syncUserToMongo(existingUser).catch(() => {});

        res.json({
          success: true,
          user: db.calculateCurrentMiningState(existingUser),
          isNew: false,
          config: db.getConfig(),
        });
        return;
      }

      let cleanReferrerId: string | null = null;
      const rawRef =
        extractedStartParam ||
        referrerId ||
        req.body?.start_param ||
        req.body?.startParam ||
        req.body?.startapp ||
        req.body?.start ||
        req.body?.tgWebAppStartParam ||
        req.query?.referrerId ||
        req.query?.start_param ||
        req.query?.startParam ||
        req.query?.startapp ||
        req.query?.start;

      if (rawRef && typeof rawRef === 'string') {
        const parsed = rawRef.replace(/^ref[_-]/i, '').trim();
        const isSelf =
          parsed === currentTgId ||
          (currentUsername && parsed.toLowerCase() === currentUsername);

        if (!isSelf && parsed) {
          let resolvedInviter = db.getUserByReferralCode(parsed) || db.getUser(parsed);
          if (!resolvedInviter && isMongoConnected()) {
            try {
              const mongoUser = await findUserByReferralCodeInMongo(parsed);
              if (mongoUser) {
                resolvedInviter = db.addUserFromMongo(mongoUser);
              }
            } catch (mErr) {
              console.warn('[UserInitController] Mongo referral lookup error:', mErr);
            }
          }
          if (resolvedInviter) {
            const inviterTgId = String(resolvedInviter.telegramId).trim();
            const inviterUsername = resolvedInviter.username ? String(resolvedInviter.username).toLowerCase().trim() : '';

            const isCircular =
              resolvedInviter.referrerId === currentTgId ||
              resolvedInviter.referrerId === `usr-${currentTgId}`;
            if (
              inviterTgId !== currentTgId &&
              inviterUsername !== currentUsername &&
              !isCircular
            ) {
              cleanReferrerId = resolvedInviter.telegramId;
            } else {
              console.warn(`[UserInitController] Blocked self/circular referral: user=${currentTgId}, inviter=${inviterTgId}, circular=${isCircular}`);
            }
          } else {
            console.log(`[UserInitController] Referral parameter "${parsed}" did not resolve to an existing registered user; ignoring.`);
          }
        }
      }

      const result = db.getOrCreateUser({
        telegramId: currentTgId,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        photoUrl: telegramUser.photo_url,
        referrerId: cleanReferrerId,
        ipAddress: ip,
        deviceFingerprint: fingerprint,
      }) as any;

      const { user, isNew, awardedReferralBonus, inviterTelegramId } = result;

      if (isNew && awardedReferralBonus > 0 && inviterTelegramId) {
        telegramBot.notifyReferrerBonus({
          referrerTelegramId: inviterTelegramId,
          referredUsername: user.username || user.firstName || 'POP Miner',
          bonusAmountPOP: awardedReferralBonus,
        }).catch((err) => {
          console.warn(`[TELEGRAM BOT] Failed to dispatch referral alert to ${inviterTelegramId}:`, err);
        });
      }

      res.json({
        success: true,
        user,
        isNew: true,
        config: db.getConfig(),
      });
    } catch (err: any) {
      console.error('[UserInitController.initUser Error]:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
