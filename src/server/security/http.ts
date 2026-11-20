export function jsonResponse(data: unknown, status = 200): Response {
    return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(status: number, error: string): Response {
    return jsonResponse({ error }, status);
}

export async function readJson(request: Request): Promise<unknown> {
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return null;
    return request.json().catch(() => null);
}

export function logSafeFailure(action: string, error: unknown): void {
    console.error(
        `Could not ${action}`,
        error instanceof Error ? { name: error.name, code: readErrorCode(error) } : { type: typeof error },
    );
}

function readErrorCode(error: Error): string | undefined {
    if (!("code" in error) || typeof error.code !== "string") return undefined;
    return error.code.slice(0, 80);
}
