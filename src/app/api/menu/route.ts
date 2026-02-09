import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Menu from "@/lib/models/Menu";

export async function GET() {
  try {
    await connectDB();
    const menuItems = await Menu.find({}).sort({ category: 1, name: 1 });
    return NextResponse.json(menuItems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const newItem = await Menu.create(body);
    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
