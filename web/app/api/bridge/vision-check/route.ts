import { checkBridgeFrame } from "../../../../lib/bridge/server";

export async function POST(request: Request) {
  try {
    const result = await checkBridgeFrame(await request.json());
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }
}
