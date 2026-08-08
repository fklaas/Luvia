# Tests v13.49.0 / Core 4.49.0

Static/release checks:
- JavaScript syntax: booking UI, booking integration, profile service
- restaurant-only reservation action contract
- accommodation provider isolation contract
- route resolver navigation/map rejection contract
- contact-page email discovery contract
- direct email-send UI contract
- handoff attribution RPC/migration presence
- profile RLS/session hardening presence
- version consistency and ZIP integrity

Production smoke tests after deployment:
1. Restaurant with SevenRooms: correct venue page, no map/navigation target.
2. Restaurant without provider but with official email: email shown automatically; send button dispatches from the dialog.
3. Restaurant without verified email: warning shown; no guessed address and no outbound mail.
4. Accommodation: no restaurant-style booking action / no Zenchef/SevenRooms routing.
5. Reisekompass: save and reload persists preferences without RLS error.
