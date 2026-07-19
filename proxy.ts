import NextAuth from "next-auth";
import { edgeAuthConfig } from "@/lib/auth/edge-config";

const { auth: proxy } = NextAuth(edgeAuthConfig);

export default proxy;

export const config = {
  matcher: ["/admin/:path*"],
};
