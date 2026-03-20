import { NextResponse } from "next/server";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const rawOrderId = Number(searchParams.get("orderId"));
    const orderId = Number.isFinite(rawOrderId) ? rawOrderId : DEFAULT_ORDER_ID;
    const result = generatePackingResult(orderId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Packing calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
