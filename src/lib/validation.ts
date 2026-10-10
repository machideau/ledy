import { z } from "zod";

// Togo phone numbers are 8 digits. We store without the +228 prefix.
export const phoneSchema = z
  .string()
  .min(8, "Entrez un numéro de téléphone valide (8 chiffres).")
  .max(8)
  .regex(/^\d{8}$/, "Le numéro doit contenir 8 chiffres.");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.");

export const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  referralCode: z
    .string()
    .min(1, "Le code de parrainage est obligatoire.")
    .regex(/^LEED-[A-Z]{2}\d{4}$/, "Code de parrainage invalide. Format attendu : LEED-AB1234."),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Entrez votre mot de passe."),
});

export const investSchema = z.object({
  planId: z.enum(["starter", "silver", "gold", "premium"]),
  // paymentMethod et phone sont optionnels : c'est la page Tchin qui les collecte
  paymentMethod: z.enum(["flooz", "tmoney"]).optional(),
  phone: phoneSchema.optional(),
});

export const withdrawSchema = z.object({
  method: z.enum(["flooz", "tmoney"]),
  phone: phoneSchema,
  amount: z
    .number()
    .int()
    .min(500, "Le montant minimum est 500 FCFA.")
    .max(10_000_000, "Le montant dépasse la limite autorisée."),
});

// #5 — admin note field: bounded and sanitised
export const adminNoteSchema = z
  .string()
  .max(500, "La note ne peut pas dépasser 500 caractères.")
  .optional()
  .nullable();

export const updateProfileSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: phoneSchema.optional(),
  defaultWithdrawMethod: z.enum(["flooz", "tmoney"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
