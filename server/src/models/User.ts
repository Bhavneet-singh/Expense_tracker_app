import { prisma } from "../config/db.js";
import { User } from "../types/index.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  password: true,
  createdAt: true,
  updatedAt: true,
} as const;

const mapUser = (user: {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}): User => ({
  _id: String(user.id),
  name: user.name,
  email: user.email,
  password: user.password,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const findUserById = async (id: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: userSelect,
  });

  return user ? mapUser(user) : null;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email.trim(),
        mode: "insensitive",
      },
    },
    select: userSelect,
  });

  return user ? mapUser(user) : null;
};

export const findUserByEmailExcludingId = async (
  email: string,
  excludedUserId: string,
): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      id: {
        not: Number(excludedUserId),
      },
      email: {
        equals: email.trim(),
        mode: "insensitive",
      },
    },
    select: userSelect,
  });

  return user ? mapUser(user) : null;
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> => {
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
    select: userSelect,
  });

  return mapUser(user);
};

export const updateUser = async (
  id: string,
  updates: Partial<Pick<User, "name" | "email" | "password">>,
): Promise<User | null> => {
  const currentUser = await findUserById(id);

  if (!currentUser) {
    return null;
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: {
      name: updates.name?.trim() ?? currentUser.name,
      email: updates.email?.trim().toLowerCase() ?? currentUser.email,
      password: updates.password ?? currentUser.password,
      updatedAt: new Date(),
    },
    select: userSelect,
  });

  return mapUser(user);
};

export const deleteUserById = async (id: string): Promise<void> => {
  await prisma.user.delete({
    where: { id: Number(id) },
  });
};
