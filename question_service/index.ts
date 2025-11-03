import express from "express";
import cors from "cors";
import supabase from "./src/models/db";
import questionRoutes from "./src/routes/questionRoutes";
import { config } from "./src/config";
import { logger } from "./src/utils/logger";

// Log immediately to test if logger is working
logger.info("Question Service initializing...");
logger.info({ config: { port: config.http.port, nodeEnv: config.nodeEnv } }, "Configuration loaded");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: config.http.corsAllowedOrigins,
  credentials: true,
}));

// Routes
app.use("/api/v1/questions", questionRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "question-service" });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  if (status >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  }
  
  res.status(status).json({
    error: err.name || 'Error',
    message,
  });
});

const startServer = async (): Promise<void> => {
  try {
    logger.info("Starting Question Service...");
    
    // Test Supabase connection
    const { data, error } = await supabase.from("questionsv3").select("*");
    logger.debug({ questionCount: data?.length }, 'Questions fetched')
    if (error) {
      logger.error({ err: error }, "Supabase connection failed");
      throw error;
    }
    
    logger.info("Connected to Supabase successfully");
    
    app.listen(config.http.port, () => {
      logger.info(`Question Service running on port ${config.http.port}`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
