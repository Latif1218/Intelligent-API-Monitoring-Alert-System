// yaha pr basically ham global level ka config likhege!!

import dotenv from "dotenv"

dotenv.config()


const config = {
    // Server
    node_env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || "5000", 10),

    // MOngodb
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/api_monitoring',
        dbName: process.env.MONGO_DB_NAME || 'api_monitoring',
    },

    // postgreSQL
    postgres: {
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        database: process.env.PG_DATABASE || 'api_monitoring',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
    },

    // RabbitMQ
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        queue: process.env.RABBITMQ_QUEUE || 'api_hits',
        publisherConfirms: process.env.RABBITMQ_PUBLISHER_CONFIRMS === 'true' || false, // IF MSGS LOST 
        retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || '3', 10),
        retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || '1000', 10),
    },

    jwt: {
        // No hardcoded production secret: set JWT_SECRET in .env (see .env.example)
        secret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-change-me"),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // Rate Limit
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10), // 1000 req / 15 min per IP
    },

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expiresIn: 24 * 60 * 60 * 1000
    },


    requireFullStack: process.env.REQUIRE_FULL_STACK === 'true',


    // Anomaly detection & alerts 
    alerts: {
        thresholds: {
            warnResponseMs: parseInt(process.env.ALERT_WARN_RESPONSE_MS || '2000', 10),
            criticalResponseMs: parseInt(process.env.ALERT_CRITICAL_RESPONSE_MS || '5000', 10),
        },
        dedupeWindowMinutes: parseInt(process.env.ALERT_DEDUPE_WINDOW_MIN || '10', 10),
        maxBatchSize: parseInt(process.env.MONITOR_MAX_BATCH || '500', 10),
        monitorApiKey: process.env.MONITOR_API_KEY || '', 
    },


    // LLms (Openai | none)
    llm: {
        provider: (process.env.LLM_PROVIDER || (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY ? 'openai' : 'none')).toLowerCase(),
        apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
        model: process.env.LLM_MODEL || '',
        timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '8000', 10),
        retries: parseInt(process.env.LLM_RETRIES || '2', 10),
    },

    // For Email notifications
    smtp: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'api-monitor@localhost',
        to: process.env.ALERT_EMAIL_TO || '',
    },

}
export default config;