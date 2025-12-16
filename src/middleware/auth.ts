
import jwt from "jsonwebtoken";


// Authentication middleware
export const isAuthenticated = (
  req: any,
  res: any,
  next: any
) => {
  // Correct return type as void
  try {
    const token =
      // req.body.token ||
      req.header("Authorization")?.replace("Bearer ", "");
    // console.log("Authorization header:", req.header("Authorization"));
    // console.log("Extracted token:", token);
    // console.log("token in authantication", token);
    if (!token) {
      res.status(400).json({
        success: false,
        message: "Token not found token in request",
      });
      return; // Use return here to exit the function without returning the response object
    }
    // console.log("token in authantication", token);

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT secret is not defined");
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // console.log("payload in authantication", payload);

    // Check if payload is of type JwtPayload
    if (typeof payload === "object") {
      req.user = payload;
    }

    next();
  } catch (error) {
    console.error("Error during authentication:", error);
    
    // Check if error is due to token expiration
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token expired",
        tokenExpired: true
      });
      return;
    }
    
    // Check if error is due to invalid token
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
        tokenExpired: true
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: "Something went wrong while verifying the token",
    });
    return;
  }
};

export const isAdmin = (
  req: any,
  res: any,
  next: any
) => {
  try {
    const user = req.user;
    // console.log("user in is admin", user);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }
    // console.log("user in is admin", user);


    // Check if the user is an admin
    console.log("user.role in middlerware", user.role)
    if (user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access this resource",
      });
    }
    // console.log("welecom to admin");

    next();
  } catch (error) {
    console.error("Error during admin check:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while checking admin status",
    });
  }
}


export const isDistrictUser = (
  req: any,
  res: any,
  next: any
) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }
    // console.log("user in is admin", user);


    // Check if the user is an admin
    console.log("user.role in middlerware", user.role)
    if (user.role !== "DISTRICT_USER") {
      res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access this resource",
      });
    }
    // console.log("welecom to admin");

    next();
  } catch (error) {
    console.error("Error during admin check:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while checking admin status",
    });
  }
}


export const isVIDHANSABHA_USER = (
  req: any,
  res: any,
  next: any
) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }
    // console.log("user in is admin", user);


    // Check if the user is an admin
    console.log("user.role in middlerware", user.role)
    if (user.role !== "VIDHANSABHA_USER") {
      res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access this resource",
      });
    }
    // console.log("welecom to admin");

    next();
  } catch (error) {
    console.error("Error during admin check:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while checking admin status",
    });
  }
}



