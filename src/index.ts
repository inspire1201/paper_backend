import express from "express";

import fileUpload from "express-fileupload";

import cors from "cors";
import { authRoute } from "./router/auth.route.js";
import { surnameRoute } from "./router/surname.route.js";
import prisma from "./prisma.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;


app.use(express.json());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Define CORS options
const corsOptions = {
  origin: "*",
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true,
};

app.use(cors(corsOptions));
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/surname", surnameRoute);



app.get("/", (req: any, res: any) => {
  res.send("Hello World!");
});

app.get("/health", (req: any, res: any) => {
  res.send("All are woriking fine");
});
// ✅ Start server after Prisma connects
async function startServer() {
  try {

    await prisma.$connect(); // <-- Connect once
   
    console.log("✅ Prisma connected");
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1); // Exit if Prisma cannot connect
  }
}

startServer();



