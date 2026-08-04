import api, { setAccessToken, getAccessToken } from "@eyeonchess/api-client";
import { useToast } from "@eyeonchess/ui";

// Intercept 429 responses globally and show a toast
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
