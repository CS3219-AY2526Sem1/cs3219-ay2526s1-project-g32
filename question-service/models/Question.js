const { DataTypes } = require("sequelize");
const sequelize = require("./db"); // DB connection

const Question = sequelize.define("Question", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  difficulty: { type: DataTypes.ENUM("Easy", "Medium", "Hard"), allowNull: false },
  topics: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: "questions",
  timestamps: true
});

module.exports = Question;
