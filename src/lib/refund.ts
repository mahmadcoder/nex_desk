/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Working out what to send back when a project is cancelled.
 *
 * The rule is "refund what you have not earned", which needs four numbers and
 * gets each of them wrong in an obvious way if you are not careful:
 *
 *  1. WHAT ACTUALLY REACHED US, not what the client sent. On an international
 *     transfer the bank takes a cut. Refunding the gross figure hands back
 *     money that never arrived and makes the agency pay the bank's fee twice.
 *
 *  2. WORK DELIVERED AT THE CONTRACT RATE, not at internal cost. A $4,000
 *     project that is half built is $2,000 of value, not the ~$600 it cost in
 *     salary. Valuing it at cost would make cancelling mid-project cheap for
 *     the client and expensive for the agency — the opposite of the intent.
 *
 *  3. THIRD-PARTY SPEND IS GONE. A domain bought in the client's name cannot
 *     be handed back, so it is deducted whether or not it was re-billed.
 *
 *  4. SENDING MONEY COSTS MONEY. The outgoing transfer fee comes off too.
 *
 * Floored at zero: if delivered work exceeds what they paid, the refund is
 * nothing. The agency does not invoice the difference on a cancellation — that
 * is a decision for a person, not for a formula.
 *
 * Pure functions, no database. Every figure that goes on the statement is
 * derived here so the statement can explain itself line by line.
 */

export type RefundInput = {
  /** Agreed contract value. */
  contractValue: number;
  currency: string;
  /** Gross payments received against this project — what the client sent. */
  paidGross: number;
  /** Bank/gateway charges deducted from those payments before they landed. */
  incomingFees: number;
  /** 0–100. How much of the work is treated as delivered. */
  progressPct: number;
  /** Money already spent on the client's behalf and not recoverable. */
  thirdPartyCosts: number;
  /** Cost of sending the refund back. */
  outgoingFee: number;
  /**
   * Minimum the agency keeps, as a percentage of what actually reached it.
   * Covers the held slot and the work turned down to hold it. Only bites when
   * it exceeds the value of work delivered. 0 gives pure pro-rata.
   */
  bookingFeePct?: number;
  /**
   * Inside the grace window AND no work started — the booking fee is waived
   * entirely. Both conditions are the caller's to establish.
   */
  inGracePeriod?: boolean;
};

export type RefundLine = {
  label: string;
  amount: number;
  /** How this line moves the total. `note` explains it in plain words. */
  kind: "credit" | "debit" | "total";
  note?: string;
};

export type RefundResult = {
  currency: string;
  /** What actually landed in the account. */
  received: number;
  /** Value of the work delivered, at contract rates. */
  earned: number;
  /** The booking fee, after any waiver. Zero inside the grace window. */
  bookingFee: number;
  /** What the agency keeps: whichever of `earned` and `bookingFee` is larger. */
  retained: number;
  /** True when the booking fee was the larger of the two and therefore applied. */
  bookingFeeApplied: boolean;
  /** True when the grace window waived the fee. */
  graceApplied: boolean;
  refund: number;
  /** True when the formula went negative and was floored. */
  flooredAtZero: boolean;
  /** By how much delivered work exceeded what was paid, if it did. */
  shortfall: number;
  lines: RefundLine[];
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clampPct = (n: number) => Math.max(0, Math.min(100, Number(n) || 0));

export function calculateRefund(input: RefundInput): RefundResult {
  const contractValue = Math.max(0, round2(input.contractValue));
  const paidGross = Math.max(0, round2(input.paidGross));
  const incomingFees = Math.max(0, round2(input.incomingFees));
  const thirdParty = Math.max(0, round2(input.thirdPartyCosts));
  const outgoingFee = Math.max(0, round2(input.outgoingFee));
  const pct = clampPct(input.progressPct);

  // Fees can never exceed the payment they came out of.
  const received = round2(Math.max(0, paidGross - Math.min(incomingFees, paidGross)));
  const earned = round2((contractValue * pct) / 100);

  // Charged on what RECEIVED, never on the contract value — so it can never
  // exceed what the client actually handed over, and a large incoming bank
  // charge reduces the fee too rather than being charged on money that never
  // arrived.
  const feePct = Math.max(0, Math.min(100, Number(input.bookingFeePct) || 0));
  const graceApplied = !!input.inGracePeriod;
  const bookingFee = graceApplied ? 0 : round2((received * feePct) / 100);

  // A floor, not an extra charge. The agency keeps whichever is larger — so
  // early cancellation is not free, and late cancellation is not undercharged.
  const retained = Math.max(earned, bookingFee);
  const bookingFeeApplied = bookingFee > earned;

  const raw = round2(received - retained - thirdParty - outgoingFee);
  const refund = Math.max(0, raw);
  const flooredAtZero = raw < 0;

  const lines: RefundLine[] = [
    {
      label: "Paid by the client",
      amount: paidGross,
      kind: "credit",
      note: "What they sent us in total.",
    },
  ];

  if (incomingFees > 0) {
    lines.push({
      label: "Bank charges on the way in",
      amount: -incomingFees,
      kind: "debit",
      note: "Taken by the bank before the money reached us, so it was never ours to return.",
    });
  }

  // Only the rule that actually applied is listed. Showing a booking-fee line
  // at zero, or a work line that was overridden, makes the statement harder to
  // argue from — and this document exists to be argued from.
  if (bookingFeeApplied) {
    lines.push({
      label: `Booking fee (${feePct}%)`,
      amount: -bookingFee,
      kind: "debit",
      note:
        earned > 0
          ? `Their start date was reserved and other work turned down to hold it. This is more than the ${pct}% of work delivered so far (${fmtPlain(earned)}), so it applies instead.`
          : "Their start date was reserved and other work turned down to hold it. No work has been delivered yet.",
    });
  } else {
    lines.push({
      label: `Work delivered (${pct}%)`,
      amount: -earned,
      kind: "debit",
      note:
        pct >= 100
          ? "The work was completed, so it is paid for in full."
          : `${pct}% of the agreed ${fmtPlain(contractValue)} contract. They keep everything produced.` +
            (feePct > 0 && !graceApplied
              ? ` More than the ${feePct}% booking fee, so the fee does not apply.`
              : ""),
    });
  }

  if (graceApplied && feePct > 0) {
    lines.push({
      label: "Booking fee waived",
      amount: 0,
      kind: "credit",
      note: `Cancelled inside the grace window with no work started, so the ${feePct}% booking fee is not charged.`,
    });
  }

  if (thirdParty > 0) {
    lines.push({
      label: "Costs paid on their behalf",
      amount: -thirdParty,
      kind: "debit",
      note: "Domains, licences and similar are bought in their name and cannot be returned.",
    });
  }

  if (outgoingFee > 0) {
    lines.push({
      label: "Cost of sending the refund",
      amount: -outgoingFee,
      kind: "debit",
      note: "An international transfer is not free.",
    });
  }

  lines.push({
    label: flooredAtZero ? "Refund due — nothing" : "Refund due",
    amount: refund,
    kind: "total",
    note: flooredAtZero
      ? `What the agency has earned exceeds what was paid by ${fmtPlain(Math.abs(raw))}. Nothing is refunded, and nothing further is invoiced.`
      : undefined,
  });

  return {
    currency: String(input.currency || "USD").toUpperCase(),
    received,
    earned,
    bookingFee,
    retained,
    bookingFeeApplied,
    graceApplied,
    refund,
    flooredAtZero,
    shortfall: flooredAtZero ? round2(Math.abs(raw)) : 0,
    lines,
  };
}

/** Plain number for use inside a sentence — the caller formats currency. */
function fmtPlain(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * A starting suggestion for "how much of this is delivered".
 *
 * `projects.progress` is what the team has been maintaining all along, so it
 * is the honest default. Milestones are offered as a cross-check because a
 * percentage nobody has updated for three weeks is worth questioning before it
 * decides a refund.
 */
export function suggestProgress(project: any, milestones: any[] = []): {
  pct: number;
  source: "milestones" | "progress" | "none";
  note: string;
} {
  const done = milestones.filter((m) => m.is_done).length;

  if (milestones.length) {
    const byMilestone = Math.round((done / milestones.length) * 100);
    const tracked = Number(project?.progress ?? 0);

    // A big gap between the two usually means one of them is stale, and the
    // admin should look before signing off a number.
    if (Math.abs(byMilestone - tracked) > 15) {
      return {
        pct: Math.max(byMilestone, tracked),
        source: "milestones",
        note:
          `Milestones say ${byMilestone}% (${done} of ${milestones.length} done) but the ` +
          `project reads ${tracked}%. The higher figure is used — check it before you send this.`,
      };
    }
    return {
      pct: byMilestone,
      source: "milestones",
      note: `${done} of ${milestones.length} milestones completed.`,
    };
  }

  const tracked = Number(project?.progress ?? 0);
  if (tracked > 0) {
    return { pct: tracked, source: "progress", note: "Taken from the project's progress bar." };
  }

  return {
    pct: 0,
    source: "none",
    note: "No milestones and no progress recorded, so nothing is treated as delivered.",
  };
}
