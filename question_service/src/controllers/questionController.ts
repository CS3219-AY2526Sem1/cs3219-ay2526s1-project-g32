import { Request, Response } from "express";
import QuestionService, { QuestionCreationAttributes } from "../models/Question";
import supabase from "../models/db";
import { 
  CreateQuestionInput, 
  UpdateQuestionInput, 
  GetQuestionsQuery, 
  GetRandomQuestionQuery,
  QuestionIdParam 
} from "../validation/schemas";

// Create a new question
export const createQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, difficulty, topics, image_url } = req.body;
    const question = await QuestionService.create({ title, description, difficulty, topics, image_url });
    res.status(201).json(question);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Get all questions (with filters)
export const getQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, difficulty, topic } = req.query;
    
    let query = supabase
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
    
    if (error) throw error;
    
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Get a single question
export const getQuestionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = await QuestionService.findByPk(req.params.id as unknown as number);
    if (!question) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(question);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Update a question
export const updateQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedQuestion = await QuestionService.update(id as unknown as number, req.body);
    
    if (!updatedQuestion) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    
    res.json(updatedQuestion);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Delete a question
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await QuestionService.destroy(id as unknown as number);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Get random question by difficulty/topic (for matching service)
export const getRandomQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { difficulty, topic } = req.query;
    
    console.log(`[GET /random] Request params:`, { difficulty, topic });
    
    let query = supabase
      .from('questions')
      .select('*');
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (topic) {
      query = query.contains('topics', [topic]);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[GET /random] Database error:', error);
      throw error;
    }
    
    console.log(`[GET /random] Found ${data?.length || 0} matching questions`);
    
    if (!data || data.length === 0) {
      res.status(404).json({ 
        error: "No questions found",
        message: difficulty || topic 
          ? `No questions found matching difficulty: ${difficulty || 'any'}, topic: ${topic || 'any'}`
          : "No questions available in the database"
      });
      return;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const randomRow = data[randomIndex];
    
    console.log(`[GET /random] Returning question ID: ${randomRow.id}`);
    
    // Convert to API format with single topic for collaboration service
    const randomQuestion = {
      id: randomRow.id,
      title: randomRow.title,
      description: randomRow.description,
      difficulty: randomRow.difficulty,
      topic: randomRow.topics?.[0] || 'General', // Return first topic as string for collaboration service
      topics: randomRow.topics, // Keep full array for backward compatibility
      image_url: randomRow.image_url,
      createdAt: new Date(randomRow.created_at),
      updatedAt: new Date(randomRow.updated_at)
    };
    
    console.log(`[GET /random] Topic: ${randomQuestion.topic}, All topics: ${randomQuestion.topics.join(', ')}`);
    
    res.json(randomQuestion);
  } catch (err) {
    const error = err as Error;
    console.error('[GET /random] Unexpected error:', error);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
