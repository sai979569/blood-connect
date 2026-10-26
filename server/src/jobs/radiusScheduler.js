import cron from 'node-cron';
import { evaluateAllActiveRequests } from '../services/adaptiveRadiusService.js';

let cronTask = null;
let intervalTimer = null;

export const startRadiusScheduler = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const intervalSeconds = Number(process.env.RADIUS_EVAL_INTERVAL_SECONDS) || (isDev ? 30 : 300);

  console.log(
    `[RadiusScheduler] Starting adaptive radius evaluation engine (Interval: every ${intervalSeconds}s)...`
  );

  // In development, run an interval timer to evaluate active requests reliably and quickly
  intervalTimer = setInterval(async () => {
    try {
      await evaluateAllActiveRequests();
    } catch (err) {
      console.error('[RadiusScheduler] Error during scheduled evaluation cycle:', err.message);
    }
  }, intervalSeconds * 1000);

  // Also run once immediately on startup after a 5 second grace period
  setTimeout(() => {
    evaluateAllActiveRequests().catch((err) =>
      console.error('[RadiusScheduler] Initial run failed:', err.message)
    );
  }, 5000);
};

export const stopRadiusScheduler = () => {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
  console.log('[RadiusScheduler] Stopped adaptive radius evaluation engine');
};

export default { startRadiusScheduler, stopRadiusScheduler };
