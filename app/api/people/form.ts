import { z } from "zod";
import { photoProblem } from "@/lib/photos";

const NameSchema = z.string().trim().min(1).max(60);

export type PersonForm = {
  name: string;
  // A new photo, or "remove", or undefined to leave it as it is.
  photo?: File | "remove";
};

// Reads the add/edit person form. Returns an error message for anything wrong.
export async function readPersonForm(request: Request): Promise<PersonForm | string> {
  const form = await request.formData().catch(() => null);
  if (!form) return "Something's missing. Try again.";
  const name = NameSchema.safeParse(form.get("name"));
  if (!name.success) return "Add a name.";
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const problem = photoProblem(photo);
    if (problem) return problem;
    return { name: name.data, photo };
  }
  return { name: name.data, photo: form.get("removePhoto") === "1" ? "remove" : undefined };
}
