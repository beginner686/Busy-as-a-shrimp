import { Injectable } from "@nestjs/common";
import {
  AdminResourceStatus,
  AdminUserRole,
  AdminUserStatus,
  CaptainLevel,
  QueryResourcesDto,
  QueryUsersDto
} from "./dto/admin.dto";

export interface AdminUserRecord {
  userId: number;
  phoneMasked: string;
  role: AdminUserRole;
  city: string;
  memberLevel: "free" | "monthly" | "yearly" | "lifetime";
  status: AdminUserStatus;
  createdAt: string;
}

export interface AdminResourceRecord {
  resourceId: number;
  userId: number;
  resourceType: "skill" | "location" | "account" | "time";
  tags: string[];
  status: AdminResourceStatus;
  createdAt: string;
  verifiedAt?: string;
  reviewNote?: string;
}

export interface AdminAnnouncement {
  noticeId: string;
  content: string;
  publisher: string;
  createdAt: string;
}

export interface AdminCaptainRecord {
  captainId: number;
  name: string;
  level: CaptainLevel;
  score: number;
  monthInvites: number;
  commissionRate: number;
}

@Injectable()
export class AdminService {
  private readonly userStore: AdminUserRecord[] = [
    {
      userId: 10001,
      phoneMasked: "138****2001",
      role: "both",
      city: "Shanghai",
      memberLevel: "monthly",
      status: "active",
      createdAt: "2026-03-01T09:00:00.000Z"
    },
    {
      userId: 10002,
      phoneMasked: "139****7788",
      role: "resource",
      city: "Hangzhou",
      memberLevel: "free",
      status: "active",
      createdAt: "2026-03-12T11:30:00.000Z"
    },
    {
      userId: 10003,
      phoneMasked: "137****6633",
      role: "service",
      city: "Shenzhen",
      memberLevel: "yearly",
      status: "frozen",
      createdAt: "2026-02-25T16:20:00.000Z"
    }
  ];

  private readonly resourceStore: AdminResourceRecord[] = [
    {
      resourceId: 20001,
      userId: 10002,
      resourceType: "skill",
      tags: ["short-video", "food", "guangzhou"],
      status: "pending",
      createdAt: "2026-03-24T06:12:00.000Z"
    },
    {
      resourceId: 20002,
      userId: 10001,
      resourceType: "location",
      tags: ["xuhui", "offline-event", "weekend"],
      status: "active",
      createdAt: "2026-03-08T09:10:00.000Z",
      verifiedAt: "2026-03-09T03:00:00.000Z"
    },
    {
      resourceId: 20003,
      userId: 10003,
      resourceType: "account",
      tags: ["xiaohongshu", "fashion"],
      status: "rejected",
      createdAt: "2026-03-20T08:30:00.000Z",
      reviewNote: "Contact details detected in profile content."
    }
  ];

  private readonly announcementStore: AdminAnnouncement[] = [
    {
      noticeId: "notice-seed-1",
      content: "Platform maintenance window: 02:00-03:00 UTC+8 every Sunday.",
      publisher: "system",
      createdAt: "2026-03-20T05:00:00.000Z"
    }
  ];

  private readonly captainStore: AdminCaptainRecord[] = [
    {
      captainId: 10010,
      name: "Captain Orion",
      level: "gold",
      score: 98,
      monthInvites: 28,
      commissionRate: 0.9
    },
    {
      captainId: 10011,
      name: "Captain Delta",
      level: "advanced",
      score: 93,
      monthInvites: 17,
      commissionRate: 0.8
    },
    {
      captainId: 10012,
      name: "Captain Nova",
      level: "normal",
      score: 88,
      monthInvites: 9,
      commissionRate: 0.6
    }
  ];

  users(filters: QueryUsersDto) {
    return this.userStore.filter((user) => {
      const statusMatched = filters.status ? user.status === filters.status : true;
      const roleMatched = filters.role ? user.role === filters.role : true;
      return statusMatched && roleMatched;
    });
  }

  updateUserStatus(id: number, status: AdminUserStatus) {
    const target = this.userStore.find((user) => user.userId === id);
    if (!target) {
      return {
        updated: false,
        reason: "user_not_found"
      };
    }
    target.status = status;
    return {
      updated: true,
      user: target
    };
  }

  resources(filters: QueryResourcesDto) {
    return this.resourceStore.filter((resource) =>
      filters.status ? resource.status === filters.status : true
    );
  }

  reviewResource(id: number, decision: "approve" | "reject", reason?: string) {
    const target = this.resourceStore.find((resource) => resource.resourceId === id);
    if (!target) {
      return {
        updated: false,
        reason: "resource_not_found"
      };
    }
    target.status = decision === "approve" ? "active" : "rejected";
    target.verifiedAt = decision === "approve" ? new Date().toISOString() : undefined;
    target.reviewNote = reason;
    return {
      updated: true,
      resource: target
    };
  }

  stats() {
    const pendingResources = this.resourceStore.filter(
      (resource) => resource.status === "pending"
    ).length;
    const activeUsers = this.userStore.filter((user) => user.status === "active").length;
    const activeCaptains = this.captainStore.filter((captain) => captain.level !== "normal").length;

    return {
      totalUsers: this.userStore.length,
      activeUsers,
      totalResources: this.resourceStore.length,
      pendingResources,
      activeCaptains,
      matchRate: 0.71,
      announcementCount: this.announcementStore.length
    };
  }

  announce(content: string, publisher = "admin") {
    const notice = {
      noticeId: `notice-${Date.now()}`,
      content,
      publisher,
      createdAt: new Date().toISOString()
    };
    this.announcementStore.unshift(notice);
    return notice;
  }

  announcements() {
    return this.announcementStore;
  }

  captainRanking() {
    return [...this.captainStore].sort((a, b) => b.score - a.score);
  }

  updateCaptainLevel(id: number, level: CaptainLevel) {
    const target = this.captainStore.find((captain) => captain.captainId === id);
    if (!target) {
      return {
        updated: false,
        reason: "captain_not_found"
      };
    }
    const rateByLevel: Record<CaptainLevel, number> = {
      normal: 0.6,
      advanced: 0.8,
      gold: 0.9
    };
    target.level = level;
    target.commissionRate = rateByLevel[level];
    return {
      updated: true,
      captain: target
    };
  }
}
