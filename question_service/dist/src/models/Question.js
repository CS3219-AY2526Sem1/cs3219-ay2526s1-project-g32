"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
const db_1 = __importDefault(require("./db"));
// Question service class for Supabase operations
class QuestionService {
    // Convert database row to API format
    static mapRowToAttributes(row) {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            difficulty: row.difficulty,
            topics: row.topics,
            image_url: row.image_url,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    // Get all questions
    static async findAll() {
        const { data, error } = await db_1.default
            .from(this.tableName)
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data?.map(this.mapRowToAttributes) || [];
    }
    // Get question by ID
    static async findByPk(id) {
        const { data, error } = await db_1.default
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // No rows found
            throw error;
        }
        return data ? this.mapRowToAttributes(data) : null;
    }
    // Create new question
    static async create(attributes) {
        const { data, error } = await db_1.default
            .from(this.tableName)
            .insert([attributes])
            .select()
            .single();
        if (error)
            throw error;
        return this.mapRowToAttributes(data);
    }
    // Update question
    static async update(id, attributes) {
        const { data, error } = await db_1.default
            .from(this.tableName)
            .update(attributes)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // No rows found
            throw error;
        }
        return data ? this.mapRowToAttributes(data) : null;
    }
    // Delete question
    static async destroy(id) {
        const { error } = await db_1.default
            .from(this.tableName)
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return true;
    }
}
exports.QuestionService = QuestionService;
QuestionService.tableName = 'questions';
exports.default = QuestionService;
