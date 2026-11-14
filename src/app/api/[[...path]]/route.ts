import { auth } from "@/server/auth";
import { apiRoutes } from "@/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleApiRequest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/api/auth")) {
        const response = await auth.handler(request);
        if (response) return response;
    }

    const response = await apiRoutes.handle(request);
    if (response.status !== 404 || (await response.clone().text()) !== "NOT_FOUND") return response;

    return Response.json({ error: "Not Found" }, { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
}

export const GET = handleApiRequest;
export const HEAD = handleApiRequest;
export const POST = handleApiRequest;
export const PUT = handleApiRequest;
export const PATCH = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
