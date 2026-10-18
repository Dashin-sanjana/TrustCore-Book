# ADR 0004: Booking engine preparation

Status: PROPOSED — both developers must review before implementation. Owner: shared.

Persist UTC instants and retain the business IANA timezone. Weekly rules use local wall-clock minutes. Proposed DST policy: nonexistent local times yield no slot; ambiguous local times yield distinct UTC slots with explicit offsets. This policy must be approved and tested before a slot engine is enabled.

The future creation transaction validates staff/service/customer tenant ownership, availability, exceptions, price/currency and cancellation rules. Persist a business-scoped idempotency key, canonical payload hash and result in the same transaction. Same key/same payload replays the result; changed payload is 409. No in-memory-only idempotency.

Keep the existing `[start,end)` staff exclusion constraint: concurrent overlaps cannot both commit, adjacent slots are permitted and cancelled records do not block. Translate SQLSTATE 23P01 to an unavailable-slot conflict. PENDING holds need an explicit expiry model/sweeper before use; do not create indefinite temporary holds.

Allowed proposed transitions: PENDING→CONFIRMED/CANCELLED; CONFIRMED→COMPLETED/CANCELLED/NO_SHOW; terminal records are immutable except reviewed correction flows. Cancellation policy contract defines minimum notice and whether customers may cancel; business settings persistence, defaults, fees/refunds and cutoff semantics are undecided and not implemented. No real booking API or mutation is exposed.
