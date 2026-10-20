import test from 'node:test';
import assert from 'node:assert/strict';
import { EmailService, maskEmail } from '../src/services/alerts/notification/emailService.js';

const smtp = (extra = {}) => ({ enabled: true, host: 'smtp.test', port: 587, user: 'u', pass: 'p', from: 'monitor@test.io', to: 'oncall@example.com', ...extra });
const alert = { _id: 'a1', severity: 'critical', apiName: 'AppointmentAPI', anomalyTypes: ['SERVER_ERROR'], message: 'down', metrics: { statusCode: 500, responseTimeMs: 5500, recordsReturned: 0 }, createdAt: new Date() };

test('maskEmail hides the name part', () => {
    assert.equal(maskEmail('oncall@example.com'), 'o***@example.com');
    assert.equal(maskEmail('a@x.io, bb@y.io'), 'a***@x.io, b***@y.io');
    assert.equal(maskEmail(''), '');
});

test('describe() explains why email is off, never leaks password or full address', () => {
    assert.match(new EmailService({ smtp: smtp({ enabled: false }) }).describe().reason, /ALERT_EMAIL_ENABLED/);
    assert.match(new EmailService({ smtp: smtp({ host: '' }) }).describe().reason, /SMTP_HOST/);
    assert.match(new EmailService({ smtp: smtp({ to: '' }) }).describe().reason, /ALERT_EMAIL_TO/);
    const d = new EmailService({ smtp: smtp() }).describe();
    assert.equal(d.enabled, true);
    assert.equal(d.to, 'o***@example.com');
    assert.equal(JSON.stringify(d).includes('"p"'), false);
    assert.equal(d.authConfigured, true);
});

test('sendAlert sends a [CRITICAL] subject through the injected transporter', async () => {
    const sent = [];
    const svc = new EmailService({ smtp: smtp(), transporter: { sendMail: async (m) => sent.push(m) } });
    assert.equal(await svc.sendAlert(alert), true);
    assert.match(sent[0].subject, /^\[CRITICAL\] AppointmentAPI/);
    assert.equal(sent[0].to, 'oncall@example.com');
});

test('disabled service sends nothing; sendTest throws a readable error', async () => {
    const sent = [];
    const svc = new EmailService({ smtp: smtp({ enabled: false }), transporter: { sendMail: async (m) => sent.push(m) } });
    assert.equal(await svc.sendAlert(alert), false);
    await assert.rejects(() => svc.sendTest(), (e) => e.code === 'EMAIL_DISABLED');
    assert.equal(sent.length, 0);
});

test('sendTest delivers a [TEST] mail when enabled', async () => {
    const sent = [];
    const svc = new EmailService({ smtp: smtp(), transporter: { sendMail: async (m) => sent.push(m) } });
    assert.equal(await svc.sendTest(), true);
    assert.match(sent[0].subject, /^\[TEST\]/);
});
