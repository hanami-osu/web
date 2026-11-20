function notFound(): Response {
    return Response.json({ error: "Not Found" }, { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
}

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
