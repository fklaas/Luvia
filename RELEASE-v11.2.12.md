# Luvia 11.2.12 · Core 3.0.2.12

## Atomic Trip Ownership
- New trips are finalized only after the authenticated creator has been assigned the owner role.
- The cloud profile is written in the same server-controlled finalization path.
- Existing single-member trips with a missing owner role are repaired safely.
- The client no longer accepts a cloud trip before ownership and profile persistence are confirmed.
