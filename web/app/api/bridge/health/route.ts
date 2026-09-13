import { bridgeHealth } from "../../../../lib/bridge/server";

export function GET() {
  const result = bridgeHealth();
  return Response.json(result.body, { status: result.status });
}
