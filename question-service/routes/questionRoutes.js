const express = require("express");
const router = express.Router();
const controller = require("../controllers/questionController");

router.post("/", controller.createQuestion);
router.get("/", controller.getQuestions);
router.get("/random", controller.getRandomQuestion);
router.get("/:id", controller.getQuestionById);
router.put("/:id", controller.updateQuestion);
router.delete("/:id", controller.deleteQuestion);

module.exports = router;
