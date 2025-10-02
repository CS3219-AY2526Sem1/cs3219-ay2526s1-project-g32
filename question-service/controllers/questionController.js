const Question = require("../models/Question");

// Create a new question
exports.createQuestion = async (req, res) => {
  try {
    const { title, description, difficulty, topics, image_url } = req.body;
    const question = await Question.create({ title, description, difficulty, topics, image_url });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all questions (with filters)
exports.getQuestions = async (req, res) => {
  try {
    const { title, difficulty, topic } = req.query;
    let where = {};

    if (title) where.title = { [require("sequelize").Op.iLike]: `%${title}%` };
    if (difficulty) where.difficulty = difficulty;
    if (topic) where.topics = { [require("sequelize").Op.contains]: [topic] };

    const questions = await Question.findAll({ where });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single question
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: "Not found" });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a question
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Question.update(req.body, { where: { id }, returning: true });
    if (!updated[0]) return res.status(404).json({ error: "Not found" });
    res.json(updated[1][0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a question
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Question.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get random question by difficulty/topic (for matching service)
exports.getRandomQuestion = async (req, res) => {
  try {
    const { difficulty, topic } = req.query;
    let where = {};
    if (difficulty) where.difficulty = difficulty;
    if (topic) where.topics = { [require("sequelize").Op.contains]: [topic] };

    const questions = await Question.findAll({ where });
    if (!questions.length) return res.status(404).json({ error: "No questions found" });

    const random = questions[Math.floor(Math.random() * questions.length)];
    res.json(random);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
