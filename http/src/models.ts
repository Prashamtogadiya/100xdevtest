import mongoose, { mongo, Mongoose } from "mongoose";
mongoose.connect(process.env.MONGO_URL!);
const UserSchema = new mongoose.Schema({
    name:String,
    email:{type:String,unique:true},
    password:String,
    role :String
})

const ClassSchema = new mongoose.Schema({
    className : String,
    teacherId:{
        type:mongoose.Types.ObjectId,
        ref:'Users',
    },
    studentIds:[{
        type:mongoose.Types.ObjectId,
        ref:'Users',
    }]
})

const AttendanceSchema = new mongoose.Schema({
    status:String,
    classId:{
        type:mongoose.Types.ObjectId,
        ref:'Class'
    },
    studentId:{
        type:mongoose.Types.ObjectId,
        ref:'Users',
    }

})


export const UserModel = mongoose.model("Users",UserSchema)
export const ClassModel = mongoose.model("Class",ClassSchema)
export const AttendanceModel = mongoose.model("Attendance",AttendanceSchema)
