import { describe, it, expect } from "vitest";
import {
  createBorrowRequestSchema,
  approveBorrowSchema,
  releaseBorrowSchema,
  processReturnSchema,
  reportLostFromBorrowSchema,
  reportDamageFromBorrowSchema,
  validateOrThrow,
} from "@/lib/validations";

// ─── Helpers ─────────────────────────────────────────────

const validUuid = "00000000-0000-4000-8000-000000000001";
const validUuid2 = "00000000-0000-4000-8000-000000000002";

// ─── createBorrowRequestSchema ──────────────────────────

describe("createBorrowRequestSchema", () => {
  const validInput = {
    asset_id: validUuid,
    borrower_id: validUuid2,
    expected_return_date: "2026-07-15",
    purpose: "Field training exercise",
  };

  it("accepts valid borrow request input", () => {
    expect(() => validateOrThrow(createBorrowRequestSchema, validInput)).not.toThrow();
  });

  it("accepts input without optional purpose field", () => {
    const { purpose, ...withoutPurpose } = validInput;
    expect(() => validateOrThrow(createBorrowRequestSchema, withoutPurpose)).not.toThrow();
  });

  it("rejects missing asset_id", () => {
    const { asset_id, ...incomplete } = validInput;
    expect(() => validateOrThrow(createBorrowRequestSchema, incomplete)).toThrow("Validation failed");
  });

  it("rejects invalid asset_id (not a UUID)", () => {
    expect(() =>
      validateOrThrow(createBorrowRequestSchema, { ...validInput, asset_id: "not-a-uuid" })
    ).toThrow("Validation failed");
  });

  it("rejects missing borrower_id", () => {
    const { borrower_id, ...incomplete } = validInput;
    expect(() => validateOrThrow(createBorrowRequestSchema, incomplete)).toThrow("Validation failed");
  });

  it("rejects missing expected_return_date", () => {
    const { expected_return_date, ...incomplete } = validInput;
    expect(() => validateOrThrow(createBorrowRequestSchema, incomplete)).toThrow("Validation failed");
  });

  it("rejects empty expected_return_date", () => {
    expect(() =>
      validateOrThrow(createBorrowRequestSchema, { ...validInput, expected_return_date: "" })
    ).toThrow("Validation failed");
  });

  it("rejects null input", () => {
    expect(() => validateOrThrow(createBorrowRequestSchema, null)).toThrow("Validation failed");
  });

  it("rejects undefined input", () => {
    expect(() => validateOrThrow(createBorrowRequestSchema, undefined)).toThrow("Validation failed");
  });
});

// ─── approveBorrowSchema ─────────────────────────────────

describe("approveBorrowSchema", () => {
  const validInput = {
    id: validUuid,
    approvedById: validUuid2,
  };

  it("accepts valid approve input", () => {
    expect(() => validateOrThrow(approveBorrowSchema, validInput)).not.toThrow();
  });

  it("accepts null approvedById", () => {
    expect(() =>
      validateOrThrow(approveBorrowSchema, { id: validUuid, approvedById: null })
    ).not.toThrow();
  });

  it("rejects missing id", () => {
    expect(() => validateOrThrow(approveBorrowSchema, { approvedById: validUuid2 })).toThrow(
      "Validation failed"
    );
  });

  it("rejects invalid UUID for id", () => {
    expect(() =>
      validateOrThrow(approveBorrowSchema, { id: "bad-id", approvedById: validUuid2 })
    ).toThrow("Validation failed");
  });
});

// ─── releaseBorrowSchema ─────────────────────────────────

describe("releaseBorrowSchema", () => {
  const validInput = {
    id: validUuid,
    releasedById: validUuid2,
    conditionBefore: "good",
  };

  it("accepts valid release input", () => {
    expect(() => validateOrThrow(releaseBorrowSchema, validInput)).not.toThrow();
  });

  it("accepts null releasedById", () => {
    expect(() =>
      validateOrThrow(releaseBorrowSchema, { ...validInput, releasedById: null })
    ).not.toThrow();
  });

  it("accepts optional signatures", () => {
    expect(() =>
      validateOrThrow(releaseBorrowSchema, {
        ...validInput,
        borrowerSignature: "data:image/png;base64,sig1",
        officerSignature: "data:image/png;base64,sig2",
      })
    ).not.toThrow();
  });

  it("rejects invalid conditionBefore", () => {
    expect(() =>
      validateOrThrow(releaseBorrowSchema, { ...validInput, conditionBefore: "nonexistent" })
    ).toThrow("Validation failed");
  });

  it("rejects missing conditionBefore", () => {
    const { conditionBefore, ...incomplete } = validInput;
    expect(() => validateOrThrow(releaseBorrowSchema, incomplete)).toThrow("Validation failed");
  });
});

// ─── processReturnSchema ─────────────────────────────────

describe("processReturnSchema", () => {
  const validInput = {
    id: validUuid,
    verified_by: validUuid2,
    condition_after: "fair",
    return_notes: "Minor scratches, otherwise okay",
    penalty_amount: 150,
    penalty_paid: true,
  };

  it("accepts valid return input with all fields", () => {
    expect(() => validateOrThrow(processReturnSchema, validInput)).not.toThrow();
  });

  it("accepts minimal return input", () => {
    expect(() =>
      validateOrThrow(processReturnSchema, {
        id: validUuid,
        verified_by: validUuid2,
        condition_after: "good",
      })
    ).not.toThrow();
  });

  it("accepts null verified_by", () => {
    expect(() =>
      validateOrThrow(processReturnSchema, {
        id: validUuid,
        verified_by: null,
        condition_after: "good",
      })
    ).not.toThrow();
  });

  it("rejects invalid condition_after", () => {
    expect(() =>
      validateOrThrow(processReturnSchema, {
        id: validUuid,
        verified_by: validUuid2,
        condition_after: "not-a-condition",
      })
    ).toThrow("Validation failed");
  });

  it("rejects negative penalty_amount", () => {
    expect(() =>
      validateOrThrow(processReturnSchema, {
        id: validUuid,
        verified_by: validUuid2,
        condition_after: "good",
        penalty_amount: -50,
      })
    ).toThrow("Validation failed");
  });
});

// ─── reportLostFromBorrowSchema ──────────────────────────

describe("reportLostFromBorrowSchema", () => {
  const validInput = {
    transactionId: validUuid,
    reporter_id: validUuid2,
    date_lost: "2026-07-10",
    location_lost: "Training grounds",
    description: "Radio went missing during field exercise",
  };

  it("accepts valid lost report input", () => {
    expect(() => validateOrThrow(reportLostFromBorrowSchema, validInput)).not.toThrow();
  });

  it("rejects missing description", () => {
    const { description, ...incomplete } = validInput;
    expect(() => validateOrThrow(reportLostFromBorrowSchema, incomplete)).toThrow(
      "Validation failed"
    );
  });

  it("rejects empty description", () => {
    expect(() =>
      validateOrThrow(reportLostFromBorrowSchema, { ...validInput, description: "" })
    ).toThrow("Validation failed");
  });

  it("rejects description exceeding 2000 chars", () => {
    expect(() =>
      validateOrThrow(reportLostFromBorrowSchema, {
        ...validInput,
        description: "a".repeat(2001),
      })
    ).toThrow("Validation failed");
  });

  it("accepts missing location_lost", () => {
    const { location_lost, ...withoutLocation } = validInput;
    expect(() => validateOrThrow(reportLostFromBorrowSchema, withoutLocation)).not.toThrow();
  });
});

// ─── reportDamageFromBorrowSchema ────────────────────────

describe("reportDamageFromBorrowSchema", () => {
  const validInput = {
    transactionId: validUuid,
    reporter_id: validUuid2,
    damage_description: "Screen cracked, antenna bent",
    estimated_repair_cost: 500,
  };

  it("accepts valid damage report input", () => {
    expect(() => validateOrThrow(reportDamageFromBorrowSchema, validInput)).not.toThrow();
  });

  it("rejects missing damage_description", () => {
    const { damage_description, ...incomplete } = validInput;
    expect(() => validateOrThrow(reportDamageFromBorrowSchema, incomplete)).toThrow(
      "Validation failed"
    );
  });

  it("accepts missing estimated_repair_cost", () => {
    const { estimated_repair_cost, ...withoutCost } = validInput;
    expect(() => validateOrThrow(reportDamageFromBorrowSchema, withoutCost)).not.toThrow();
  });

  it("rejects negative repair cost", () => {
    expect(() =>
      validateOrThrow(reportDamageFromBorrowSchema, {
        ...validInput,
        estimated_repair_cost: -1,
      })
    ).toThrow("Validation failed");
  });
});

// ─── validateOrThrow helper ──────────────────────────────

describe("validateOrThrow", () => {
  it("throws with field-level error messages in the error", () => {
    try {
      validateOrThrow(createBorrowRequestSchema, { asset_id: "bad" });
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("Validation failed");
      expect(e.message).toContain("asset_id");
    }
  });
});
