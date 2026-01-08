import express from "express";
import { CreateClassSchema, SignupSchema, SingInSchema } from "./types.js";
import { ClassModel, UserModel } from "./models.js";
import mongoose, { mongo } from "mongoose";
import jwt from "jsonwebtoken";
import { authMiddleware, teacherRoleMiddleware } from "./middleware.js";
const app = express();

app.use(express.json());

app.post("/auth/signup", async (req, res) => {
  const { success, data } = SignupSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
  }

  const user = await UserModel.findOne({ email: data.email });
  if (user) {
    return res.status(400).json({
      success: false,
      error: "Email already exists",
    });
  }

  const userDb = await UserModel.create({
    email: data.email,
    password: data.password,
    name: data.name,
  });
  res.json({
    success: true,
    data: {
      _id: userDb._id,
      name: userDb.name,
      email: userDb.email,
      password: userDb.password,
    },
  });
});

app.post("/auth/login", async (req, res) => {
  const { success, data } = SingInSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
  }

  const userDb = await UserModel.findOne({
    email: data.email,
  });
  if (!userDb || userDb.password != data.password) {
    return res.status(400).json({
      success: false,
      error: "Invalid Email or Password",
    });
  }

  const token = await jwt.sign(
    {
      role: userDb.role,
      userId: userDb._id,
    },
    process.env.JWT_SECRETKEY!
  );

  res.json({
    success: true,
    data: {
      token,
    },
  });
});

app.post("/auth/me", authMiddleware, async (req, res) => {
  const user = await UserModel.findOne({ _id: req.userId });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
    res.json({
      success: true,
      data: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
      },
    });
  }
});

app.post("/class", authMiddleware, teacherRoleMiddleware, async (req, res) => {
  const { success, data } = CreateClassSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
  }
});

app.listen(3000, () => {
  console.log("server started on port 3000");
});
