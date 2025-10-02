const express = require("express");
const sequelize = require("./models/db");
const questionRoutes = require("./routes/questionRoutes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use("/questions", questionRoutes);

const PORT = process.env.PORT || 4000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log(`Question Service running on port ${PORT}`));
});
