import { Request, Response } from "express";
import QuestionService, { QuestionCreationAttributes } from "../models/Question";
import supabase from "../models/db";

// Define interfaces for type safety
interface CreateQuestionBody {
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  image_url?: string;
}

interface GetQuestionsQuery {
  title?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  topic?: string;
}

interface QuestionParams {
  id: string;
}

interface UpdateQuestionBody {
  title?: string;
  description?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  topics?: string[];
  image_url?: string;
}

interface GetRandomQuestionQuery {
  difficulty?: "Easy" | "Medium" | "Hard";
  topic?: string;
}

// Create a new question
export const createQuestion = async (req: Request<{}, any, CreateQuestionBody>, res: Response): Promise<void> => {
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
export const getQuestions = async (req: Request<{}, any, any, GetQuestionsQuery>, res: Response): Promise<void> => {
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
export const getQuestionById = async (req: Request<QuestionParams>, res: Response): Promise<void> => {
  try {
    const question = await QuestionService.findByPk(parseInt(req.params.id));
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
export const updateQuestion = async (req: Request<QuestionParams, any, UpdateQuestionBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedQuestion = await QuestionService.update(parseInt(id), req.body);
    
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
export const deleteQuestion = async (req: Request<QuestionParams>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await QuestionService.destroy(parseInt(id));
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
export const getRandomQuestion = async (req: Request<{}, any, any, GetRandomQuestionQuery>, res: Response): Promise<void> => {
  try {
    const { difficulty, topic } = req.query;
    
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
    
    if (error) throw error;
    
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
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};
