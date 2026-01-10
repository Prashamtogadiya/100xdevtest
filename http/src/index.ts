import express from "express";
import {
  AddStudentSchema,
  CreateClassSchema,
  SignupSchema,
  SingInSchema,
} from "./types.js";
import { ClassModel, UserModel } from "./models.js";
import mongoose from "mongoose";
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

  const classDb = await ClassModel.create({
    className: data.className,
    teacherId: req.userId as string,
    studentIds: [],
  });
  res.json({
    success: true,
    data: {
      _id: classDb._id,
      className: classDb.className,
      teacherId: classDb.teacherId,
      studentIds: [],
    },
  });
});

app.post(
  "/class/:id/add-student",
  authMiddleware,
  teacherRoleMiddleware,
  async (req, res) => {
    const { success, data } = AddStudentSchema.safeParse(req.body);
    if (!success) {
      return res.json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const studentId = data.studentId;
    const classDb = await ClassModel.findOne({
      _id: req.params._id,
    });

    if (!classDb) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }
    const userDb = await UserModel.findOne({
      _id: studentId,
    });

    if (!userDb) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    classDb.studentIds.push(new mongoose.Types.ObjectId(studentId));
    await classDb.save();

    res.json({
      success: true,
      data: {
        _id: classDb._id,
        className: classDb.className,
        teacherId: classDb.teacherId,
        studentIds: classDb.studentIds,
      },
    });
  }
);

app.listen(3000, () => {
  console.log("server started on port 3000");
});
