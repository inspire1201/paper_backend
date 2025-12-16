import prisma from "../src/prisma.js";

export const addUser = async () => {
  try {
    const data = [
      {
        name: "manish",
        code: "1234",
        email: "manishkeer530@gmail.com",
      },
      {
        name: "visha",
        code: "5555",
        email: "vishalRajput8906@gmail.com",
      },
    ];

    console.log("Attempting to insert users into the database...");

    const result = await prisma.user.createMany({
      data: data,
      skipDuplicates: true,
    });

    console.log("✅ User insertion completed.");
    console.log(`Number of new users added: ${result.count}`);
  } catch (error) {
    console.error("❌ Error adding users to the database:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
};


