const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

export class EmailService {
    constructor({ smtp, logger = silentLogger }) {
        this.smtp = smtp;
        this.logger = logger;
        this.transporter = null;
    }

    get enabled() {
        return Boolean(this.smtp.enabled && this.smtp.host && this.smtp.to);
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
}
