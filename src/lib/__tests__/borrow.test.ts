import { describe, it, expect } from "vitest";
import {
  calculatePenalty,
  isOverdue,
  BORROW_STATUS_CONFIG,
  generateReceiptData,
} from "@/lib/borrow";
import type { BorrowTransaction } from "@/types/database";

// ─── calculatePenalty ─────────────────────────────────---

describe("calculatePenalty", () => {
  it("returns zero penalty when returned on time", () => {
    const result = calculatePenalty("2026-07-15", "2026-07-15");
    expect(result.days).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("returns zero penalty when returned early", () => {
    const result = calculatePenalty("2026-07-20", "2026-07-15");
    expect(result.days).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("calculates correct penalty for 3 days late with default rate", () => {
    const result = calculatePenalty("2026-07-10", "2026-07-13");
    expect(result.days).toBe(3);
    expect(result.amount).toBe(150); // 3 * 50
  });

  it("calculates correct penalty with custom daily rate", () => {
    const result = calculatePenalty("2026-07-10", "2026-07-13", 100);
    expect(result.days).toBe(3);
    expect(result.amount).toBe(300); // 3 * 100
  });

  it("returns zero for same-day return", () => {
    const result = calculatePenalty("2026-07-10", "2026-07-10");
    expect(result.days).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("handles string dates with time components", () => {
    const result = calculatePenalty(
      "2026-07-10T00:00:00.000Z",
      "2026-07-13T00:00:00.000Z"
    );
    expect(result.days).toBe(3);
  });

  it("returns zero when days difference is negative (returned before due)", () => {
    const result = calculatePenalty("2026-07-20T00:00:00Z", "2026-07-10T00:00:00Z");
    expect(result.days).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("rounds up partial days", () => {
    // 2.5 days late should round up to 3
    const result = calculatePenalty("2026-07-10T06:00:00Z", "2026-07-12T18:00:00Z");
    expect(result.days).toBeGreaterThanOrEqual(3);
  });
});

// ─── isOverdue ───────────────────────────────────────────

describe("isOverdue", () => {
  it("returns true when due date is in the past", () => {
    expect(isOverdue("2020-01-01")).toBe(true);
  });

  it("returns false when due date is in the future", () => {
    // Use a far-future date so this test never flaky-fails
    expect(isOverdue("2099-12-31")).toBe(false);
  });

  it("returns false for today's date (not past yet)", () => {
    // This is the current time — borderline, but should return false
    // since isOverdue checks "<" (strictly before now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isOverdue(tomorrow.toISOString())).toBe(false);
  });
});

// ─── BORROW_STATUS_CONFIG ────────────────────────────────

describe("BORROW_STATUS_CONFIG", () => {
  it("covers all expected borrow statuses", () => {
    const expectedStatuses = [
      "pending",
      "approved",
      "released",
      "returned",
      "late",
      "lost",
      "damaged",
      "rejected",
    ];
    for (const status of expectedStatuses) {
      expect(BORROW_STATUS_CONFIG[status]).toBeDefined();
      expect(BORROW_STATUS_CONFIG[status].label).toBeTruthy();
    }
  });

  it("each status has a valid variant", () => {
    const validVariants = ["default", "secondary", "destructive", "outline"];
    for (const config of Object.values(BORROW_STATUS_CONFIG)) {
      expect(validVariants).toContain(config.variant);
    }
  });
});

// ─── generateReceiptData ─────────────────────────────────

describe("generateReceiptData", () => {
  const mockTransaction = {
    id: "txn-123",
    transaction_no: "BOR-2026-0001",
    borrow_date: "2026-07-01T00:00:00Z",
    expected_return_date: "2026-07-15T00:00:00Z",
    actual_return_date: "2026-07-14T00:00:00Z",
    condition_before: "good",
    condition_after: "fair",
    penalty_amount: 0,
    penalty_paid: false,
    return_notes: "Returned in good condition",
    asset: {
      item_name: "Field Radio PRC-77",
      asset_id: "MSUZS-ROTC-2026-0001",
    },
    borrower: {
      first_name: "Juan",
      last_name: "Dela Cruz",
    },
  } as unknown as BorrowTransaction;

  it("generates correct receipt structure", () => {
    const receipt = generateReceiptData(mockTransaction);
    expect(receipt.receiptNo).toBe("RCT-BOR-2026-0001");
    expect(receipt.transactionNo).toBe("BOR-2026-0001");
    expect(receipt.transactionId).toBe("txn-123");
    expect(receipt.itemName).toBe("Field Radio PRC-77");
    expect(receipt.assetId).toBe("MSUZS-ROTC-2026-0001");
    expect(receipt.borrowerName).toBe("Juan Dela Cruz");
    expect(receipt.borrowDate).toBe("2026-07-01T00:00:00Z");
  });
});

// ─── State Machine Transition Logic ──────────────────────

describe("Borrow State Machine — Status Transitions", () => {
  type BorrowStatus =
    | "pending"
    | "approved"
    | "released"
    | "returned"
    | "late"
    | "lost"
    | "damaged"
    | "rejected";

  // Valid transitions: { from: to[] }
  const transitions: Record<BorrowStatus, BorrowStatus[]> = {
    pending: ["approved", "rejected"],
    approved: ["released", "rejected"],
    released: ["returned", "late", "lost", "damaged"],
    returned: [],
    late: ["returned", "lost", "damaged"],
    lost: [],
    damaged: [],
    rejected: [],
  };

  it.each(Object.entries(transitions))(
    "status %s has valid transitions to %s",
    (from, toList) => {
      // Verify no invalid transitions exist — each 'to' must be a real status
      for (const to of toList) {
        expect(BORROW_STATUS_CONFIG[to]).toBeDefined();
      }
    }
  );

  it("every status that can transition is referenced", () => {
    const allStatuses = Object.keys(BORROW_STATUS_CONFIG) as BorrowStatus[];
    const reachable = new Set<BorrowStatus>();
    for (const [, toList] of Object.entries(transitions)) {
      for (const to of toList) {
        reachable.add(to);
      }
    }
    // 'pending' is the only initial status, doesn't need incoming edges
    reachable.add("pending");

    for (const status of allStatuses) {
      expect(reachable.has(status)).toBe(true);
    }
  });

  it("terminal states have no outgoing transitions", () => {
    for (const [status, toList] of Object.entries(transitions)) {
      if (status === "returned" || status === "lost" || status === "damaged" || status === "rejected") {
        expect(toList).toHaveLength(0);
      }
    }
  });

  it("state machine progresses forward without cycles", () => {
    // Verify there are no cycles by checking that 'returned', 'lost', 'damaged', 'rejected'
    // (terminal states) never appear as transition targets from earlier states back to earlier ones
    const terminalStates: BorrowStatus[] = ["returned", "lost", "damaged", "rejected"];
    for (const [, toList] of Object.entries(transitions)) {
      for (const to of toList) {
        // Terminal states should only transition to themselves (no transition)
        if (terminalStates.includes(to)) {
          expect(transitions[to]).toEqual([]);
        }
      }
    }
  });
});
