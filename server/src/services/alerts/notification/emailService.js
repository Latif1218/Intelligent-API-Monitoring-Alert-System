const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

/** a***@example.com : never expose full addresses to the UI */
export function maskEmail(address) {
    if (!address || typeof address !== 'string') return '';
    return address
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => {
            const [name, domain] = a.split('@');
            if (!domain) return '***';
            return `${name.slice(0, 1)}***@${domain}`;
        })
        .join(', ');
}


export class EmailService {
    constructor({ smtp, logger = silentLogger, transporter = null }) {
        this.smtp = smtp;
        this.logger = logger;
        this.transporter = transporter;
    }

    get enabled() {
        return Boolean(this.smtp.enabled && this.smtp.host && this.smtp.to);
    }

    /** Safe description of the email setup for the dashboard (no passwords, masked addresses). */
    describe() {
        let reason = 'Email notifications are on.';
        if (!this.smtp.enabled) reason = 'Disabled: ALERT_EMAIL_ENABLED is not "true".';
        else if (!this.smtp.host) reason = 'Misconfigured: SMTP_HOST is empty.';
        else if (!this.smtp.to) reason = 'Misconfigured: ALERT_EMAIL_TO is empty.';

        return {
            enabled: this.enabled,
            reason,
            host: this.smtp.host || null,
            port: this.smtp.port || null,
            from: this.smtp.from || null,
            to: maskEmail(this.smtp.to) || null,
            authConfigured: Boolean(this.smtp.user && this.smtp.pass),
        };
    }

    async _getTransporter() {
        if (this.transporter) return this.transporter;
        const { default: nodemailer } = await import('nodemailer');
        this.transporter = nodemailer.createTransport({
            host: this.smtp.host,
            port: this.smtp.port,
            secure: this.smtp.port === 465,
            auth: this.smtp.user ? { user: this.smtp.user, pass: this.smtp.pass } : undefined,
        });
        return this.transporter;
    }

    /** @returns {Promise<boolean>} true if sent */
    async sendAlert(alert) {
        if (!this.enabled) return false;
        const tag = alert.severity === 'critical' ? 'CRITICAL' : 'WARNING';
        const transporter = await this._getTransporter();
        await transporter.sendMail({
            from: this.smtp.from,
            to: this.smtp.to,
            subject: `[${tag}] ${alert.apiName}: ${alert.anomalyTypes.join(', ')}`,
            text: [
                alert.message,
                '',
                `Status code: ${alert.metrics.statusCode}`,
                `Response time: ${alert.metrics.responseTimeMs} ms`,
                `Records returned: ${alert.metrics.recordsReturned ?? 'missing'}`,
                `Detected at: ${new Date(alert.createdAt).toISOString()}`,
            ].join('\n'),
        });
        this.logger.info('Alert email sent', { alertId: String(alert._id), to: this.smtp.to });
        return true;
    }

    /** Sends a harmless test message so you can confirm SMTP settings from the dashboard. */
    async sendTest() {
        if (!this.enabled) {
            const err = new Error(this.describe().reason);
            err.code = 'EMAIL_DISABLED';
            throw err;
        }
        const transporter = await this._getTransporter();
        await transporter.sendMail({
            from: this.smtp.from,
            to: this.smtp.to,
            subject: '[TEST] API Monitor email check',
            text: `This is a test email from the API Monitoring system, sent at ${new Date().toISOString()}.\nIf you can read this, alert emails will reach you.`,
        });
        this.logger.info('Test email sent', { to: this.smtp.to });
        return true;
    }
}
