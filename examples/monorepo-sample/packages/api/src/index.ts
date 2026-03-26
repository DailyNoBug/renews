export type User = {
  id: string;
  email: string;
};

export const normalizeUser = (user: User): User => ({
  ...user,
  email: user.email.trim().toLowerCase(),
});
