import { Request, Response } from "express";
import { Op } from "sequelize";
import Question from "../models/Question";

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
    const question = await Question.create({ title, description, difficulty, topics, image_url });
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
    const where: any = {};

    if (title) {
      where.title = { [Op.iLike]: `%${title}%` };
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (topic) {
      where.topics = { [Op.contains]: [topic] };
    }

    const questions = await Question.findAll({ where });
    res.json(questions);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Get a single question
export const getQuestionById = async (req: Request<QuestionParams>, res: Response): Promise<void> => {
  try {
    const question = await Question.findByPk(req.params.id);
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
    const [affectedRows, updatedQuestions] = await Question.update(req.body, { 
      where: { id }, 
      returning: true 
    });
    
    if (affectedRows === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    
    res.json(updatedQuestions[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

// Delete a question
export const deleteQuestion = async (req: Request<QuestionParams>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await Question.destroy({ where: { id } });
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
    const where: any = {};
    
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (topic) {
      where.topics = { [Op.contains]: [topic] };
    }

    const questions = await Question.findAll({ where });
    if (questions.length === 0) {
      res.status(404).json({ error: "No questions found" });
      return;
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const randomQuestion = questions[randomIndex];
    res.json(randomQuestion);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};
