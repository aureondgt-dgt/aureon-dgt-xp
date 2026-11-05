import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

export default async function RootPage() {
  const member = await getCurrentMember();
  redirect(member ? "/inicio" : "/login");
}
