import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Menu from "@/lib/models/Menu";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    const updatedItem = await Menu.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!updatedItem)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const deletedItem = await Menu.findByIdAndDelete(id);
    if (!deletedItem)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
