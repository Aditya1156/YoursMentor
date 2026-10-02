import { Resend } from 'resend'
import { env } from '../config/env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

type Mail = { to: string; subject: string; heading: string; body: string[]; cta?: { label: string; url: string } }

/** Spec §9: plain-language subject, one clear button, preferences footer. */
function render({ heading, body, cta }: Omit<Mail, 'to' | 'subject'>) {
  const paragraphs = body
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#5A5E7D">${p}</p>`)
    .join('')
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#2E2A9E;color:#fff;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px">${cta.label}</a>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#F7F8FC;font-family:'Plus Jakarta Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="font-size:18px;font-weight:800;color:#2E2A9E;margin:0 0 24px">OneStep</p>
    <div style="background:#fff;border:1px solid #E6E8F2;border-radius:14px;padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#14152E">${heading}</h1>
      ${paragraphs}${button}
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#797E9C">
      You received this because you have a OneStep account.
      <a href="${env.CLIENT_URL}/settings" style="color:#2E2A9E">Manage email preferences</a>.
    </p>
  </div></body></html>`
}

export async function sendMail(mail: Mail) {
  const html = render(mail)

  if (!resend) {
    // No API key yet (spec §15) — log the link so local flows are testable.
    console.log(`\n[email] to=${mail.to} subject="${mail.subject}"`)
    if (mail.cta) console.log(`[email] ${mail.cta.label}: ${mail.cta.url}\n`)
    return
  }

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      html,
    })
  } catch (err) {
    // A failed email must never fail the request that triggered it.
    console.error('Failed to send email:', err)
  }
}

export const sendVerificationEmail = (to: string, name: string, token: string) =>
  sendMail({
    to,
    subject: 'Confirm your email to finish signing up',
    heading: `Welcome to OneStep, ${name}`,
    body: [
      'Confirm your email address and you can start booking sessions with seniors who were exactly where you are.',
      'This link works for 24 hours.',
    ],
    cta: { label: 'Confirm my email', url: `${env.CLIENT_URL}/verify-email?token=${token}` },
  })

export const sendPasswordResetEmail = (to: string, name: string, token: string) =>
  sendMail({
    to,
    subject: 'Reset your OneStep password',
    heading: `Reset your password, ${name}`,
    body: [
      'Click below to choose a new password. This link works for 1 hour.',
      'If you did not ask for this, you can ignore this email — your password will not change.',
    ],
    cta: { label: 'Choose a new password', url: `${env.CLIENT_URL}/reset-password?token=${token}` },
  })
