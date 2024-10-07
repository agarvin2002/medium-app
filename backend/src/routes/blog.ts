import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";
import { signinInput, signupInput, createPostInput, updatePostInput } from "@agarvin2002/medium-app-common"

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  try {
    const user = (await verify(authHeader, c.env.JWT_SECRET)) as { id: string };
    c.set("userId", user.id);
    await next();
  } catch (error) {
    c.status(403);
    return c.json({ error: "Not logged in" });
  }
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { success } = createPostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: authorId,
    },
  });
  return c.json({ id: blog.id });
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const { success } = updatePostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blog = await prisma.blog.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  return c.json({ id: blog.id });
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blogs = await prisma.blog.findMany();
  return c.json({ blogs });
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        id: id,
      },
    });
    return c.json({ blog });
  } catch (err) {
    c.status(411);
    return c.json({ error: "Error while fetching data" });
  }
});
