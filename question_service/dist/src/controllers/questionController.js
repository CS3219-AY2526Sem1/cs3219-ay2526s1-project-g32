"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomQuestion = exports.deleteQuestion = exports.updateQuestion = exports.getQuestionById = exports.getQuestions = exports.createQuestion = void 0;
const Question_1 = __importDefault(require("../models/Question"));
const db_1 = __importDefault(require("../models/db"));
// Create a new question
const createQuestion = async (req, res) => {
    try {
        const { title, description, difficulty, topics, image_url } = req.body;
        const question = await Question_1.default.create({ title, description, difficulty, topics, image_url });
        res.status(201).json(question);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.createQuestion = createQuestion;
// Get all questions (with filters)
const getQuestions = async (req, res) => {
    try {
        const { title, difficulty, topic } = req.query;
        let query = db_1.default
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });
        if (title) {
            query = query.ilike('title', `%${title}%`);
        }
        if (difficulty) {
            query = query.eq('difficulty', difficulty);
        }
        if (topic) {
            query = query.contains('topics', [topic]);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        // Convert to API format
        const questions = data?.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            difficulty: row.difficulty,
            topics: row.topics,
            image_url: row.image_url,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        })) || [];
        res.json(questions);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.getQuestions = getQuestions;
// Get a single question
const getQuestionById = async (req, res) => {
    try {
        const question = await Question_1.default.findByPk(parseInt(req.params.id));
        if (!question) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json(question);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.getQuestionById = getQuestionById;
// Update a question
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedQuestion = await Question_1.default.update(parseInt(id), req.body);
        if (!updatedQuestion) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json(updatedQuestion);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.updateQuestion = updateQuestion;
// Delete a question
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Question_1.default.destroy(parseInt(id));
        if (!deleted) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.json({ message: "Deleted successfully" });
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.deleteQuestion = deleteQuestion;
// Get random question by difficulty/topic (for matching service)
const getRandomQuestion = async (req, res) => {
    try {
        const { difficulty, topic } = req.query;
        let query = db_1.default
            .from('questions')
            .select('*');
        if (difficulty) {
            query = query.eq('difficulty', difficulty);
        }
        if (topic) {
            query = query.contains('topics', [topic]);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        if (!data || data.length === 0) {
            res.status(404).json({ error: "No questions found" });
            return;
        }
        const randomIndex = Math.floor(Math.random() * data.length);
        const randomRow = data[randomIndex];
        // Convert to API format
        const randomQuestion = {
            id: randomRow.id,
            title: randomRow.title,
            description: randomRow.description,
            difficulty: randomRow.difficulty,
            topics: randomRow.topics,
            image_url: randomRow.image_url,
            createdAt: new Date(randomRow.created_at),
            updatedAt: new Date(randomRow.updated_at)
        };
        res.json(randomQuestion);
    }
    catch (err) {
        const error = err;
        res.status(500).json({ error: error.message });
    }
};
exports.getRandomQuestion = getRandomQuestion;
