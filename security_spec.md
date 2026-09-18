# Security Specification: Guest Mode & User Authentication

## 1. Threat Model & Data Invariants

### 1.1 Invariants
1. **User Data Isolation**: A regular user (`role == 'customer'`) MUST only be permitted to read and write their own document in `/users/{userId}` where `userId == request.auth.uid`.
2. **Elevation Prevention**: A customer MUST NOT be able to modify their `role`, `status`, `sellerStatus`, `riderStatus`, or `isSuperAdmin` flags during document creation or update.
3. **Order Privacy**: Customers can ONLY read orders where `customerId == request.auth.uid` or `customerEmail == request.auth.token.email` or `customerPhone == request.auth.token.phone_number`. Unauthenticated guests CANNOT read orders collection directly.
4. **Guest Order Creation**: Unauthenticated or authenticated users can create orders, provided required fields (`id`, `items`, `total`, `customerPhone`) are present.
5. **No OTP Persistence**: OTP codes MUST NEVER be written to Firestore documents or collections, and MUST NEVER be saved to `localStorage`. OTP verification is handled strictly via Firebase Authentication or ephemeral memory.
6. **Stock Integrity**: Stock decrements during checkout are constrained to stock/options attributes and validated atomically.

## 2. The Dirty Dozen Attack Payloads & Mitigation

| # | Attack Vector / Payload | Targeted Resource | Expected Security Rules Response | Mitigation in Code / Rules |
|---|---|---|---|---|
| 1 | `GET /users/{otherUserId}` by Customer A | `/users/{otherUserId}` | `PERMISSION_DENIED` | Rule check: `isSignedIn() && request.auth.uid == userId` |
| 2 | `UPDATE /users/{ownUid}` with `{ role: 'admin' }` | `/users/{ownUid}` | `PERMISSION_DENIED` | Rule check: `!('role' in request.resource.data) \|\| request.resource.data.role == resource.data.role` |
| 3 | `UPDATE /users/{ownUid}` with `{ isSuperAdmin: true }` | `/users/{ownUid}` | `PERMISSION_DENIED` | Rule check: `!('isSuperAdmin' in request.resource.data) \|\| request.resource.data.isSuperAdmin == resource.data.isSuperAdmin` |
| 4 | `CREATE /users/{arbitraryUid}` without matching Auth UID | `/users/{arbitraryUid}` | `PERMISSION_DENIED` | Rule check: `isSignedIn() && request.auth.uid == userId` |
| 5 | Unauthenticated `GET /orders` query | `/orders` | `PERMISSION_DENIED` | Query requires matching user credentials or Admin/Staff privileges |
| 6 | Customer A `GET /orders/{customerBOrderId}` | `/orders/{orderId}` | `PERMISSION_DENIED` | Rule check: `resource.data.customerId == request.auth.uid` |
| 7 | Customer modifying `paymentStatus: "paid"` on order | `/orders/{orderId}` | `PERMISSION_DENIED` | Rule check: `request.resource.data.paymentStatus == resource.data.paymentStatus` |
| 8 | Writing simulated or real OTP into `/users` or `/otps` | Any collection | `PERMISSION_DENIED` / Disallowed | OTP is kept in memory only; never transmitted to Firestore |
| 9 | Guest order missing required phone number | `/orders/{orderId}` | `PERMISSION_DENIED` | Rule check: `request.resource.data.keys().hasAll(['id', 'items', 'total', 'customerPhone'])` |
| 10 | Customer tampering with another user's wallet balance | `/wallet/{otherUid}` | `PERMISSION_DENIED` | Rule check: `request.auth.uid == walletId` |
| 11 | Malicious product modification during guest checkout | `/products/{prodId}` | `PERMISSION_DENIED` | Rule check: only `stock` and `options` can be affected |
| 12 | Deleting orders or user profiles without admin authorization | `/orders/{id}` or `/users/{id}` | `PERMISSION_DENIED` | Rule check: `allow delete: if isAdmin();` |
