import { WidgetHandler, getErrorMessage } from "./types";

export const arcaneWidget: WidgetHandler = {
  type: "arcane",
  fetchData: async (settings: Record<string, any>, serviceUrl?: string) => {
    const { token, environmentId } = settings;

    console.log("[Arcane Widget] Received settings:", settings);
    console.log("[Arcane Widget] Service URL:", serviceUrl);
    console.log(
      "[Arcane Widget] Token:",
      token ? `${token.substring(0, 20)}...` : "missing",
    );
    console.log("[Arcane Widget] Environment ID:", environmentId);

    if (!serviceUrl || !token || !environmentId) {
      console.error("[Arcane Widget] Missing configuration:", {
        hasServiceUrl: !!serviceUrl,
        hasToken: !!token,
        hasEnvironmentId: !!environmentId,
      });
      return {
        error: "Missing Arcane configuration",
        runningContainers: 0,
        stoppedContainers: 0,
        totalContainers: 0,
      };
    }

    try {
      const arcaneUrl = `${serviceUrl}/api/environments/${environmentId}/containers/counts`;
      const response = await fetch(arcaneUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[Arcane Widget] url:", arcaneUrl);

      console.log(await response.json());

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error("Invalid API response");
      }

      return {
        runningContainers: data.data.runningContainers,
        stoppedContainers: data.data.stoppedContainers,
        totalContainers: data.data.totalContainers,
      };
    } catch (error) {
      console.error("[Arcane Widget] Error fetching data:", error);
      return {
        error: getErrorMessage(error),
        runningContainers: 0,
        stoppedContainers: 0,
        totalContainers: 0,
      };
    }
  },
};
