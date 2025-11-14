import { Request, Response } from "express";
import QuestionService, { QuestionCreationAttributes } from "../models/Question";
import supabase from "../models/db";
import { logger } from "../utils/logger";
import { sampleQuestions } from "../seeds/sampleQuestions";
import {
  CreateQuestionInput,
  UpdateQuestionInput,
  GetQuestionsQuery,
  GetRandomQuestionQuery,
  QuestionIdParam,
} from "../validation/schemas";

// Helper function to parse topics - handles both array and JSON string formats
function parseTopics(topics: any): string[] {
  if (Array.isArray(topics)) {
    return topics;
  }
  if (typeof topics === 'string') {
    try {
      const parsed = JSON.parse(topics);
      return Array.isArray(parsed) ? parsed : [topics];
    } catch {
      return [topics];
    }
  }
  return [];
}

function normalizeTopicFilters(topic: unknown): string[] {
  if (!topic) {
    return [];
  }
  if (Array.isArray(topic)) {
    return topic
      .map((value) => (typeof value === 'string' ? value : String(value)))
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (typeof topic === 'string') {
    const trimmed = topic.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

// Create a new question
export const createQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, slug, description, difficulty, topics, starter_python, starter_c, starter_cpp, starter_java, starter_javascript } = req.body;
    const question = await QuestionService.create({ 
      title, 
      slug, 
      description, 
      difficulty, 
      topics, 
      starter_python, 
      starter_c, 
      starter_cpp, 
      starter_java, 
      starter_javascript 
    });
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
    const topicFilters = normalizeTopicFilters(topic);

    const buildQuery = () => {
      let query = supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (title) {
        query = query.ilike('title', `%${title}%`);
      }
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      return query;
    };

    const executeQuery = async () => {
      const { data, error } = await buildQuery();
      if (error) throw error;
      return data ?? [];
    };

    let data = await executeQuery();

    if (data.length === 0 && !title && !difficulty && topicFilters.length === 0) { // if database is initially empty, seed sample questions
      logger.info('Question bank empty; seeding sample questions');
      const { error: seedError } = await supabase.from('questions').insert(
        sampleQuestions.map((question) => ({
          title: question.title,
          slug: question.slug,
          description: question.description,
          difficulty: question.difficulty,
          topics: question.topics,
          starter_python: question.starter_python,
          starter_c: question.starter_c,
          starter_cpp: question.starter_cpp,
          starter_java: question.starter_java,
          starter_javascript: question.starter_javascript,
        })),
      );

      if (seedError) {
        logger.error({ err: seedError }, 'Failed to seed sample questions');
        throw seedError;
      }

      data = await executeQuery();
    }
    
    // Convert to API format
    const filteredData =
      topicFilters.length === 0
        ? data
        : data?.filter((row) => {
            const normalizedTopics = parseTopics(row.topics);
            return topicFilters.some((filterTopic) => normalizedTopics.includes(filterTopic));
          });

    const questions = filteredData?.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      difficulty: row.difficulty,
      topics: parseTopics(row.topics),
      description: row.description,
      starterCode: {
        python: row.starter_python,
        c: row.starter_c,
        cpp: row.starter_cpp,
        java: row.starter_java,
        javascript: row.starter_javascript
      }
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

// Get a single question by slug
export const getQuestionBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    logger.info({ slug }, '[GET /slug/:slug] Fetching question by slug');
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error || !data) {
      logger.warn({ slug, error }, '[GET /slug/:slug] Question not found');
      res.status(404).json({ error: "Question not found" });
      return;
    }
    
    const question = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      difficulty: data.difficulty,
      topics: parseTopics(data.topics),
      starterCode: {
        python: data.starter_python,
        c: data.starter_c,
        cpp: data.starter_cpp,
        java: data.starter_java,
        javascript: data.starter_javascript
      }
    };
    
    logger.info({ questionId: data.id, slug }, '[GET /slug/:slug] Question found');
    res.json(question);
  } catch (err) {
    const error = err as Error;
    logger.error({ error: error.message, stack: error.stack }, '[GET /slug/:slug] Error');
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
    const topicFilters = normalizeTopicFilters(topic);

    logger.info({ difficulty, topic }, '[GET /random] Request params');

    let query = supabase
      .from('questions')
      .select('*');
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, '[GET /random] Database error');
      throw error;
    }
    
    logger.info({ count: data?.length || 0 }, '[GET /random] Found matching questions');
    
    if (!data || data.length === 0) {
      res.status(404).json({ 
        error: "No questions found",
        message: difficulty || topicFilters.length > 0
          ? `No questions found matching difficulty: ${difficulty || 'any'}, topic: ${topicFilters.join(', ') || 'any'}`
          : "No questions available in the database"
      });
      return;
    }

    const filtered =
      topicFilters.length === 0
        ? data
        : data.filter((row) => {
            const normalizedTopics = parseTopics(row.topics);
            return topicFilters.some((filterTopic) => normalizedTopics.includes(filterTopic));
          });

    if (!filtered || filtered.length === 0) {
      res.status(404).json({
        error: "No questions found",
        message:
          topicFilters.length > 0
            ? `No questions found matching difficulty: ${difficulty || 'any'}, topic: ${topicFilters.join(', ')}`
            : `No questions found matching difficulty: ${difficulty || 'any'}`,
      });
      return;
    }

    logger.info({ count: filtered.length }, '[GET /random] Filtered by topics');

    const randomIndex = Math.floor(Math.random() * filtered.length);
    const randomRow = filtered[randomIndex];
    logger.info({ questionId: randomRow.id }, '[GET /random] Returning question');
    
    // Parse topics from JSON string or array
    const parsedTopics = parseTopics(randomRow.topics);
    
    // Convert to API format with single topic for collaboration service
    const randomQuestion = {
      id: randomRow.id,
      title: randomRow.title,
      slug: randomRow.slug,
      description: randomRow.description,
      difficulty: randomRow.difficulty,
      topic: parsedTopics[0] || 'General', // Return first topic as clean string for collaboration service
      topics: parsedTopics, // Keep full array for backward compatibility
      starterCode: {
        python: randomRow.starter_python,
        c: randomRow.starter_c,
        cpp: randomRow.starter_cpp,
        java: randomRow.starter_java,
        javascript: randomRow.starter_javascript
      }
    };
    
    logger.info({ topic: randomQuestion.topic, allTopics: randomQuestion.topics }, '[GET /random] Topic selection');
    
    res.json(randomQuestion);
  } catch (err) {
    const error = err as Error;
    logger.error({ error: error.message, stack: error.stack }, '[GET /random] Unexpected error');
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
