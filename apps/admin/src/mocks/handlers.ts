import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/api/v1/admin/stats", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        totalUsers: 1024,
        totalResources: 488,
        matchRate: 0.71
      }
    });
  }),
  http.get("*/api/v1/admin/users", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [{ userId: 10001, status: "active" }]
    });
  }),
  http.get("*/api/v1/admin/resources", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [{ resourceId: 20001, reviewStatus: "pending" }]
    });
  }),
  http.put("*/api/v1/admin/resources/:id", ({ params, request }) => {
    return request.json().then((body) => {
      const decision =
        typeof body === "object" && body !== null && "decision" in body ? body.decision : "reject";
      return HttpResponse.json({
        success: true,
        message: "审核完成",
        data: {
          resourceId: Number(params.id),
          status: decision === "approve" ? "active" : "rejected"
        }
      });
    });
  }),
  http.get("*/api/v1/admin/captain/ranking", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [{ captainId: 10010, level: "gold", score: 98 }]
    });
  })
];
