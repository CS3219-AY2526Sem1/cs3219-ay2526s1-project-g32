import express from "express";
import supabase from "./src/models/db";
import questionRoutes from "./src/routes/questionRoutes";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/questions", questionRoutes);

const PORT = process.env.PORT || 3001;

const startServer = async (): Promise<void> => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('questions').select('count', { count: 'exact' });
    if (error) {
      console.error("Supabase connection failed:", error.message);
      throw error;
    }
    
    console.log(`Connected to Supabase successfully`);
    
    app.listen(PORT, () => {
      console.log(`Question Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
