export type FormDataLike = {
  get: (name: string) => unknown;
};

export async function readFormData(req: Request): Promise<FormDataLike> {
  return (await req.formData()) as unknown as FormDataLike;
}

