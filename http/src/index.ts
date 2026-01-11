import express from "express";
import {
  AddStudentSchema,
  AttendanceStartSchema,
  CreateClassSchema,
  SignupSchema,
  SingInSchema,
} from "./types.js";
import { AttendanceModel, ClassModel, UserModel } from "./models.js";
import mongoose, { Mongoose } from "mongoose";
import jwt from "jsonwebtoken";
import { authMiddleware, teacherRoleMiddleware } from "./middleware.js";
import { success } from "zod";
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

app.post("/class/:id/add-student",authMiddleware,teacherRoleMiddleware,async (req, res) => {
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

    if (classDb?.teacherId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, not class teacher",
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

app.get("/class/:id", authMiddleware, async (req, res) => {
  const classDb = await ClassModel.findOne({
    _id: req.params.id,
  });
  if (!classDb) {
    return res.status(400).json({
      success: false,
      error: "Class not found",
    });
  }
  if (
    classDb.teacherId === req.userId ||
    classDb.studentIds.map((x) => x.toString()).includes(req.userId!)
  ) {
    const students = await UserModel.find({
      _id: classDb.studentIds,
    });

    return res.json({
      success: true,
      data: {
        _id: classDb._id,
        className: classDb.className,
        teacherId: classDb.teacherId,
        students: students.map((s) => ({
          _id: s._id,
          name: s.name,
          email: s.email,
        })),
      },
    });
  } else {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
    });
  }
});

app.get("/students",authMiddleware,teacherRoleMiddleware,async (req, res) => {
    const users = await UserModel.find({
      role: "student",
    });
    return res.json({
      success: true,
      data: users.map((s) => ({
        id: s._id,
        name: s.name,
        email: s.email,
      })),
    });
  }
);

app.get("/class/:id/my-attendence", authMiddleware, async (req, res) => {
  if (req.role !== "student") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
    });
  }
  const classId = new mongoose.Types.ObjectId(req.params.id);
  const userId = new mongoose.Types.ObjectId(req.userId);
  const attendance = await AttendanceModel.findOne({
    classId,
    studentId: userId,
  });

  if (attendance) {
    return res.json({
      success: true,
      data: {
        classId: classId,
        status: "present",
      },
    });
  }else{
    return res.json({
      success: true,
      data: {
        classId: classId,
        status: null,
      },
    });
  }
});

app.post('/attendance/start',authMiddleware,teacherRoleMiddleware,async(req,res)=>{
    const {success,data} = AttendanceStartSchema.safeParse(req.body);
    if(!success){
      return res.json({
        success:false,
        error:"Invalid Request Schema"
      })
    }

    const classDb =await ClassModel.findOne({
      _id:data.classId
    })

    if(!classDb || classDb.teacherId!=req.userId){
      return res.status(401).json({
        success:false,
        error:"Forbidden, not class teacher"
      })
    }

    
})

app.listen(3000, () => {
  console.log("server started on port 3000");
});
