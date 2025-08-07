export class GithubModelsError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GithubModelsError";
  }
}

export async function handleResponseError(res: Response): Promise<GithubModelsError> {
  const text = await res.text();
  let message = text;
  try {
    const data = JSON.parse(text) as { message?: string };
    if (data.message) message = data.message;
  } catch {
    // ignore
  }
  const err = new GithubModelsError(message, res.status);
  return err;
}
