import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './shared/config/index.js';
import logger from './shared/config/logger.js';
import mongodb from './shared/config/mongodb.js';
import postgres from './shared/config/postgres.js';
import rabbitmq from './shared/config/rabbitmq.js';
import errorHandler from './shared/middlewares/errorHandler.js';
import ResponseFormatter from './shared/utils/responseFormatter.js';
import cookieParser from "cookie-parser"


// Routers
import authRouter from "./services/auth/routes/authRouter.js";
import clientRouter from './services/client/routes/clientRoutes.js';


/**
 1. Initialize Express app
 */
const app = express();

/**
 2. Middlewares
 */
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/**
  1. Request logging middleware
  2. Logs the HTTP method, path, IP address, and user agent for each incoming request.
 */
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next()
})


/**
  1. Health check endpoint
 */
app.get('/health', (req, res) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
            'Service is healthy'
        )
    );
});


/**
  1. Root endpoint
  2. Provides basic information about the API service and available endpoints.
 */
app.get("/", (req, res) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                service: 'API Hit Monitoring System',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    auth: '/api/auth',
                    ingest: '/api/hit',
                    analytics: '/api/analytics',
                    monitor: 'POST /api/monitor (alias /monitor)',
                    alerts: 'GET /api/alerts (alias /alerts)',
                },
            },
            'API Hit Monitoring Service'
        )
    )
});


/**
  1. 404 Handler
 */
app.use((req, res) => {
    res.status(404).json(ResponseFormatter.error("Endpoint not found", 404))
})


/**
 * API Routes
 */
app.use("/api/auth", authRouter);
app.use("/api", clientRouter)



/**
  1. Initialize database connections and start the server
 */
async function initializeConnection() {
    try {
        logger.info("Initializing database connections...");

        // Connect to MongoDB;
        await mongodb.connect();

        // PostgreSQL + RabbitMQ power the original hit-tracking pipeline. They are required only
        // when REQUIRE_FULL_STACK=true; otherwise a failure is logged and the alerts API still works.
        for (const [name, connect] of [
            ["PostgreSQL", () => postgres.testConnection()],
            ["RabbitMQ", () => rabbitmq.connect()],
        ]) {
            try {
                await connect();
            } catch (err) {
                if (config.requireFullStack) throw err;
                logger.warn(`${name} unavailable - running in lite mode (hit-tracking analytics disabled)`);
            }
        }

        logger.info("All connections established successfully");
    } catch (error) {
        logger.error("Failed to initialize connections:", error);
        throw error;
    }
}



/**
 1. Start the Express server after establishing database connections.
 2. Also sets up graceful shutdown handlers for SIGINT and SIGTERM signals.
 3. On shutdown, it closes the HTTP server and all database connections before exiting the process.
 4. If any error occurs during startup or shutdown, it logs the error and exits with a non-zero status code.
 */
async function startServer() {
    try {
        await initializeConnection();

        const server = app.listen(config.port, () => {
            logger.info(`Server started on port ${config.port}`);
            logger.info(`Environment: ${config.node_env}`);
            logger.info(`API available at: http://localhost:${config.port}`);
        });


        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully...`);

            server.close(async () => {
                logger.info("HTTP server closed");

                try {
                    await mongodb.disconnect();
                    await postgres.close().catch(() => {});
                    await rabbitmq.close();
                    logger.info('All connections closed, exiting process');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            })

            setTimeout(() => {
                logger.error("Forced shutdown")
                process.exit(1);
            }, 10000);

        }

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer()