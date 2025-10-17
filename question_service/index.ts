import express from "express";
import sequelize from "./src/models/db";
import questionRoutes from "./src/routes/questionRoutes";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/questions", questionRoutes);

const PORT = process.env.PORT || 4000;

const startServer = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true });
    app.listen(PORT, () => {
      console.log(`Question Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
