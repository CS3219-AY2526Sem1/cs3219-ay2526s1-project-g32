import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "./db";

interface QuestionAttributes {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  image_url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface QuestionCreationAttributes extends Optional<QuestionAttributes, "id" | "createdAt" | "updatedAt"> {}

class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: number;
  public title!: string;
  public description!: string;
  public difficulty!: "Easy" | "Medium" | "Hard";
  public topics!: string[];
  public image_url?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Question.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  difficulty: { type: DataTypes.ENUM("Easy", "Medium", "Hard"), allowNull: false },
  topics: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  tableName: "questions",
  timestamps: true
});

export default Question;
