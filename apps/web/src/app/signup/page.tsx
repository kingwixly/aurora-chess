import { redirect } from "next/navigation";

/**
 * `/signup` is the phrasing most people try first. Redirect rather than
 * duplicate the page, so there is one implementation and one URL in analytics.
 */
export default function SignupAlias() {
  redirect("/register");
}
