import { NextResponse } from "next/server";
import { fetchProduct } from "@/store/useStore";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const product = await fetchProduct(id);

    if (!product) {
        return NextResponse.json({ options: [] }, { status: 404 });
    }

    return NextResponse.json({ options: product.options });
}
