import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false });

/** Sends an email via SMTP (Mailpit in dev: http://localhost:8025). Never throws; failures are logged. */
export async function sendMail(msg: { to: string; subject: string; html: string; text: string }) {
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, ...msg });
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${msg.subject}" to ${msg.to}:`, (err as Error).message);
    return false;
  }
}
