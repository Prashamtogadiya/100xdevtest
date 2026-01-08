import z from "zod";

export const SignupSchema = z.object({
    name:z.string(),
    email:z.email(),
    password:z.string().min(6),
    role :z.enum(["teacher","student"])
}) 

export const SingInSchema = z.object({
    email:z.email(),
    password:z.string()
})

export const CreateClassSchema = z.object({
    className:z.string()
})