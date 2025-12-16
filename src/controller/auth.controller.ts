import prisma from "../prisma.js";

import jwt from "jsonwebtoken"
import dotenv from 'dotenv'

dotenv.config();


export const registerUser = async (req: any, res: any) => {
    try {
        const { name, code,email } = req.body;

        if (!name || !code ) {
            return res.status(400).json({ success: false, message: "Name, code and  are required" });
        }

        

        const existingUser = await prisma.user.findUnique({
            where: { code },
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this code already exists" });
        }

          const newUser = await prisma.user.create({
            data: {
                name,
                code,
                email:email,
            },
        });



          return res.status(201).json({ success: true, message: "User registered successfully", data: { user: newUser } });


    } catch (error) {
        console.log("error in register user", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}


export const login = async (req: any, res: any) => {
  try {
    const { code} = req.body;
    console.log("code in login", code)
    if (!code || code.length !== 4 ) {
      return res.status(400).json({ success: false, message: 'All fileds are required' });
    }

      const user = await prisma.user.findUnique({
      where: { code },
    });

  
    if (!user) {
      return res.status(401).json({ success: false, message: 'User Not found' });
    }

    if(user.code!=code){
      return res.status(401).json({ success: false, message: 'Invalid 4-digit code' });
    }

  

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'JWT secret not configured' });
    }
      const payload = {
      id: user.id,

    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15d' });
    // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1m' });
   
   
    res.json({
      success: true,
      message: "Login Successful",
      data: {
        token: token,
        user: user
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};









