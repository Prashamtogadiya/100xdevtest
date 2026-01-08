import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
export const authMiddleware = async(req:Request,res:Response, next:NextFunction)=>{
    const token = req.headers.authorization ;
    if(!token){
        return res.status(401).json({
            "success":false,
            "error":"Unauthorized, token missing or invalid"
        })
    }
    console.log(typeof token );
    
    try{
        const {userId,role}= await jwt.verify(token,process.env.JWT_SECRETKEY!) as JwtPayload ;
        req.userId = userId ;
        req.role = role ;
        next()
    }catch(err){
       return res.status(401).json({
            "success":false,
            "error":"Unauthorized, token missing or invalid"
        })
    }
}

export const teacherRoleMiddleware = (req:Request,res:Response,next:NextFunction)=>{
    if(!req.role|| req.role!="teacher"){
        return res.status(403).json({
            "success":false,
            "error":"Forbidden, teacher access required"
        })
    }
    next()
}