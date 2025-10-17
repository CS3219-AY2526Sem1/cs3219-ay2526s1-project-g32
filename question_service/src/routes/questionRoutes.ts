import express from "express";
import {
  createQuestion,
  getQuestions,
  getRandomQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion
} from "../controllers/questionController";

const router = express.Router();

router.post("/", createQuestion);
router.get("/", getQuestions);
router.get("/random", getRandomQuestion);
router.get("/:id", getQuestionById);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;
