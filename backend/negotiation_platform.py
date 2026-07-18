"""
NegotiationPlatform: the shared message-board between organizer and sponsor agents.
"""

from typing import List, Optional, Tuple
from datetime import datetime
import uuid

from models import SponsorshipPackage, NegotiationTerm, Proposal, Contract


class NegotiationPlatform:
    def __init__(
        self,
        organizer_name: str,
        sponsor_name: str,
        max_rounds: int = 10,
    ) -> None:
        self.organizer_name = organizer_name
        self.sponsor_name = sponsor_name
        self.max_rounds = max_rounds
        self.packages: List[SponsorshipPackage] = []
        self.negotiation_history: List[Proposal] = []

    # ------------------------------------------------------------------
    # Package management
    # ------------------------------------------------------------------

    def register_packages(self, packages: List[SponsorshipPackage]) -> None:
        self.packages.extend(packages)

    def get_inventory_summary(self) -> str:
        if not self.packages:
            return "No sponsorship packages available."

        lines = ["Available Sponsorship Packages:", "=" * 50]
        for pkg in self.packages:
            lines += [
                f"  ID              : {pkg.id}",
                f"  Package Name    : {pkg.name}",
                f"  Location        : {pkg.location}",
                f"  Available Tiers : {', '.join(pkg.available_tiers)}",
                f"  Min Price       : ${pkg.min_price_per_day:.2f}/day",
                f"  Max Duration    : {pkg.max_duration_days} days",
                f"  Available From  : {pkg.available_from}",
                f"  Notes           : {pkg.organizer_notes}",
                "-" * 50,
            ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Negotiation history
    # ------------------------------------------------------------------

    def get_negotiation_history(self) -> str:
        if not self.negotiation_history:
            return "No proposals have been made yet."

        lines = ["Deal History:", "=" * 50]
        for p in self.negotiation_history:
            t = p.terms
            lines += [
                f"  Proposal ID   : {p.id}",
                f"  Round         : {p.round_number}",
                f"  From          : {'ORGANIZER' if p.from_party == 'seller' else 'SPONSOR'}",
                f"  Status        : {p.status.upper()}",
                f"  Package ID    : {t.package_id}",
                f"  Tier          : {t.tier}",
                f"  Duration      : {t.duration_days} days",
                f"  Price/Day     : ${t.price_per_day:.2f}",
                f"  Start Date    : {t.start_date}",
            ]
            if t.special_conditions:
                lines.append(f"  Conditions    : {t.special_conditions}")
            lines += [f"  Message       : {p.message}", "-" * 50]
        return "\n".join(lines)

    def get_latest_proposal(self) -> Optional[Proposal]:
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
        action: str,          # "accept" | "reject" | "counter"
        counter_terms: Optional[NegotiationTerm] = None,
        message: str = "",
    ) -> Proposal:
        target: Optional[Proposal] = None
        for p in self.negotiation_history:
            if p.id == proposal_id:
                target = p
                break

        if target is None:
            raise ValueError(f"Proposal {proposal_id!r} not found.")

        if target.status != "pending":
            raise ValueError(f"Proposal {proposal_id!r} is already {target.status!r}.")

        responding_party: str = "seller" if target.from_party == "buyer" else "buyer"

        if action == "accept":
            target.status = "accepted"
            return target

        if action == "reject":
            target.status = "rejected"
            return target

        if action == "counter":
            if counter_terms is None:
                raise ValueError("counter_terms must be provided when action is 'counter'.")
            target.status = "rejected"
            return self.submit_proposal(responding_party, counter_terms, message)

        raise ValueError(f"Unknown action {action!r}. Use 'accept', 'reject', or 'counter'.")

    # ------------------------------------------------------------------
    # State checks
    # ------------------------------------------------------------------

    def is_negotiation_over(self) -> Tuple[bool, str]:
        if not self.negotiation_history:
            return False, ""

        for p in self.negotiation_history:
            if p.status == "accepted":
                return True, f"Agreement reached on proposal {p.id}."

        if len(self.negotiation_history) >= self.max_rounds:
            return True, f"Maximum rounds ({self.max_rounds}) reached without agreement."

        last = self.negotiation_history[-1]
        if last.status == "rejected":
            return True, "Last proposal was rejected with no counter-offer. Deal ended."

        return False, ""

    # ------------------------------------------------------------------
    # Contract generation
    # ------------------------------------------------------------------

    def generate_contract(self, proposal_id: str) -> Contract:
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

        pkg: Optional[SponsorshipPackage] = None
        for s in self.packages:
            if s.id == target.terms.package_id:
                pkg = s
                break

        if pkg is None:
            raise ValueError(f"Package {target.terms.package_id!r} not found.")

        total_price = target.terms.price_per_day * target.terms.duration_days

        return Contract(
            id=str(uuid.uuid4()),
            organizer_name=self.organizer_name,
            sponsor_name=self.sponsor_name,
            package=pkg,
            terms=target.terms,
            total_price=total_price,
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            signed=True,
        )
