"""
NegotiationPlatform: the shared message-board between seller and buyer agents.
"""

from typing import List, Optional, Tuple
from datetime import datetime
import uuid

from models import AdSpace, NegotiationTerm, Proposal, Contract


class NegotiationPlatform:
    def __init__(
        self,
        seller_name: str,
        buyer_name: str,
        max_rounds: int = 10,
    ) -> None:
        self.seller_name = seller_name
        self.buyer_name = buyer_name
        self.max_rounds = max_rounds
        self.ad_inventory: List[AdSpace] = []
        self.negotiation_history: List[Proposal] = []

    # ------------------------------------------------------------------
    # Inventory management
    # ------------------------------------------------------------------

    def register_ad_spaces(self, spaces: List[AdSpace]) -> None:
        """Add ad spaces to the inventory."""
        self.ad_inventory.extend(spaces)

    def get_inventory_summary(self) -> str:
        """Return a human-readable list of available ad spaces."""
        if not self.ad_inventory:
            return "No ad spaces available."

        lines = ["Available Advertising Spaces:", "=" * 50]
        for space in self.ad_inventory:
            lines += [
                f"  ID       : {space.id}",
                f"  Name     : {space.name}",
                f"  Location : {space.location}",
                f"  Formats  : {', '.join(space.available_formats)}",
                f"  Min Price: ${space.min_price_per_day:.2f}/day",
                f"  Max Duration: {space.max_duration_days} days",
                f"  Available From: {space.available_from}",
                f"  Notes    : {space.seller_notes}",
                "-" * 50,
            ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Negotiation history
    # ------------------------------------------------------------------

    def get_negotiation_history(self) -> str:
        """Return a human-readable transcript of all proposals."""
        if not self.negotiation_history:
            return "No proposals have been made yet."

        lines = ["Negotiation History:", "=" * 50]
        for p in self.negotiation_history:
            t = p.terms
            lines += [
                f"  Proposal ID  : {p.id}",
                f"  Round        : {p.round_number}",
                f"  From         : {p.from_party.upper()}",
                f"  Status       : {p.status.upper()}",
                f"  Space ID     : {t.ad_space_id}",
                f"  Format       : {t.format}",
                f"  Duration     : {t.duration_days} days",
                f"  Price/Day    : ${t.price_per_day:.2f}",
                f"  Start Date   : {t.start_date}",
            ]
            if t.special_conditions:
                lines.append(f"  Conditions   : {t.special_conditions}")
            lines += [f"  Message      : {p.message}", "-" * 50]
        return "\n".join(lines)

    def get_latest_proposal(self) -> Optional[Proposal]:
        """Return the most recently submitted proposal, or None."""
        for p in reversed(self.negotiation_history):
            return p
        return None

    # ------------------------------------------------------------------
    # Proposal submission / response
    # ------------------------------------------------------------------

    def submit_proposal(
        self,
        from_party: str,
        terms: NegotiationTerm,
        message: str,
    ) -> Proposal:
        """Create and record a new proposal."""
        # Mark any previous pending proposals from this party as withdrawn
        for p in self.negotiation_history:
            if p.from_party == from_party and p.status == "pending":
                p.status = "withdrawn"

        round_number = len(self.negotiation_history) + 1
        proposal = Proposal(
            id=str(uuid.uuid4()),
            round_number=round_number,
            from_party=from_party,  # type: ignore[arg-type]
            terms=terms,
            message=message,
            status="pending",
        )
        self.negotiation_history.append(proposal)
        return proposal

    def respond_to_proposal(
        self,
        proposal_id: str,
        action: str,  # "accept" | "reject" | "counter"
        counter_terms: Optional[NegotiationTerm] = None,
        message: str = "",
    ) -> Proposal:
        """
        Accept, reject, or counter a pending proposal.

        - accept/reject: updates the existing proposal's status and returns it.
        - counter: creates a new proposal from the responding party.
        """
        # Find the target proposal
        target: Optional[Proposal] = None
        for p in self.negotiation_history:
            if p.id == proposal_id:
                target = p
                break

        if target is None:
            raise ValueError(f"Proposal {proposal_id!r} not found.")

        if target.status != "pending":
            raise ValueError(
                f"Proposal {proposal_id!r} is already {target.status!r}."
            )

        responding_party: str = (
            "seller" if target.from_party == "buyer" else "buyer"
        )

        if action == "accept":
            target.status = "accepted"
            return target

        if action == "reject":
            target.status = "rejected"
            return target

        if action == "counter":
            if counter_terms is None:
                raise ValueError(
                    "counter_terms must be provided when action is 'counter'."
                )
            target.status = "rejected"
            return self.submit_proposal(responding_party, counter_terms, message)

        raise ValueError(f"Unknown action {action!r}. Use 'accept', 'reject', or 'counter'.")

    # ------------------------------------------------------------------
    # State checks
    # ------------------------------------------------------------------

    def is_negotiation_over(self) -> Tuple[bool, str]:
        """
        Return (done, reason).

        done=True when:
          - A proposal has been accepted.
          - Max rounds exceeded.
          - Both parties have rejected / withdrawn without countering.
        """
        if not self.negotiation_history:
            return False, ""

        # Check for acceptance
        for p in self.negotiation_history:
            if p.status == "accepted":
                return True, f"Agreement reached on proposal {p.id}."

        # Count meaningful rounds (each submitted proposal counts as one)
        if len(self.negotiation_history) >= self.max_rounds:
            return True, f"Maximum negotiation rounds ({self.max_rounds}) reached without agreement."

        # If the last proposal was rejected (not countered) and there are no
        # pending proposals, negotiation is at an impasse
        last = self.negotiation_history[-1]
        if last.status == "rejected":
            return True, "Last proposal was rejected with no counter-offer. Negotiation ended."

        return False, ""

    # ------------------------------------------------------------------
    # Contract generation
    # ------------------------------------------------------------------

    def generate_contract(self, proposal_id: str) -> Contract:
        """Generate a signed contract from an accepted proposal."""
        target: Optional[Proposal] = None
        for p in self.negotiation_history:
            if p.id == proposal_id:
                target = p
                break

        if target is None:
            raise ValueError(f"Proposal {proposal_id!r} not found.")

        if target.status != "accepted":
            raise ValueError(
                f"Cannot generate contract: proposal {proposal_id!r} status is {target.status!r}."
            )

        # Find the ad space
        space: Optional[AdSpace] = None
        for s in self.ad_inventory:
            if s.id == target.terms.ad_space_id:
                space = s
                break

        if space is None:
            raise ValueError(
                f"Ad space {target.terms.ad_space_id!r} not found in inventory."
            )

        total_price = target.terms.price_per_day * target.terms.duration_days

        return Contract(
            id=str(uuid.uuid4()),
            seller_name=self.seller_name,
            buyer_name=self.buyer_name,
            ad_space=space,
            terms=target.terms,
            total_price=total_price,
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            signed=True,
        )
