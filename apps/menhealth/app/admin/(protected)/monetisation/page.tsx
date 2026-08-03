import { redirect } from "next/navigation";

/**
 * British-spelling route kept for backward-compatibility.
 * Canonical admin path is /admin/monetization.
 */
export default function MonetisationRedirectPage() {
  redirect("/admin/monetization");
}
