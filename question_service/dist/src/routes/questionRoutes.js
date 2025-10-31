"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const questionController_1 = require("../controllers/questionController");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
router.post("/", validation_1.validateCreateQuestion, questionController_1.createQuestion);
router.get("/", validation_1.validateQuestionsQuery, questionController_1.getQuestions);
router.get("/random", validation_1.validateRandomQuestionQuery, questionController_1.getRandomQuestion);
router.get("/:id", validation_1.validateQuestionId, questionController_1.getQuestionById);
router.put("/:id", validation_1.validateQuestionId, validation_1.validateUpdateQuestion, questionController_1.updateQuestion);
router.delete("/:id", validation_1.validateQuestionId, questionController_1.deleteQuestion);
exports.default = router;
