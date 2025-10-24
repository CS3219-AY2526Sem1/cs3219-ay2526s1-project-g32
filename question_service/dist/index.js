"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./src/models/db"));
const questionRoutes_1 = __importDefault(require("./src/routes/questionRoutes"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/questions", questionRoutes_1.default);
const PORT = process.env.PORT || 3001;
const startServer = async () => {
    try {
        // Test Supabase connection
        const { data, error } = await db_1.default.from('questions').select('count', { count: 'exact' });
        if (error) {
            console.error("Supabase connection failed:", error.message);
            throw error;
        }
        console.log(`Connected to Supabase successfully`);
        app.listen(PORT, () => {
            console.log(`Question Service running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
