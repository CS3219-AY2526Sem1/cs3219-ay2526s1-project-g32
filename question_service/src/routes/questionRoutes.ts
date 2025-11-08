import express from "express";
import {
  createQuestion,
  getQuestions,
  getRandomQuestion,
  getQuestionById,
  getQuestionBySlug,
  updateQuestion,
  deleteQuestion
} from "../controllers/questionController";
import {
  validateCreateQuestion,
  validateUpdateQuestion,
  validateQuestionId,
  validateQuestionSlug,
  validateQuestionsQuery,
  validateRandomQuestionQuery
} from "../middleware/validation";

const router = express.Router();

router.post("/", validateCreateQuestion, createQuestion);
router.get("/", validateQuestionsQuery, getQuestions);
router.get("/random", validateRandomQuestionQuery, getRandomQuestion);
router.get("/slug/:slug", validateQuestionSlug, getQuestionBySlug);
router.get("/:id", validateQuestionId, getQuestionById);
router.put("/:id", validateQuestionId, validateUpdateQuestion, updateQuestion);
router.delete("/:id", validateQuestionId, deleteQuestion);

export default router;
