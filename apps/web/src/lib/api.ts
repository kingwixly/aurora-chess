import api, { setAccessToken, getAccessToken } from "@aurora/api-client";
import { useToast } from "@aurora/ui";

// Intercept 429 responses globally and show a toast
// A moderation 403 is routed to the standing page, which explains what
// happened and whether it can be appealed. Without this the player just finds
// buttons that do nothing.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.code === "MODERATION_RESTRICTED" &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/standing")
    ) {
      window.location.href = "/standing";
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers?.["retry-after"];
    const msg = retryAfter
      ? `Too many requests — try again in ${retryAfter}s`
      : "Too many requests — please wait a moment";
    useToast.getState().show(msg, "error");
  }
  return Promise.reject(error);
});

export { setAccessToken, getAccessToken };
export default api;
