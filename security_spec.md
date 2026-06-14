# Security Specification for ANotes Database Sync

This specification outlines the data integrity constraints, permission levels, and test vectors for securing note sync on Firebase Firestore.

## 1. Data Invariants
- **Notebook folders** and **Interactive study notes** can only be accessed, list-queried, or mutated by their authenticated creators (`userId == request.auth.uid`).
- **Relational Integrity**: A note cannot reference a `folderId` unless that folder belongs to the exact same authenticated user.
- **Timestamp Integrity**: All notes and folders register creation and progression timestamps.

## 2. The "Dirty Dozen" Threat Payloads
The security rules are strictly verified to return `PERMISSION_DENIED` on the following insecure payload vectors:
1. **Unauthenticated Read/Write**: Attempting to read/write folders or notes when not signed in.
2. **Folder Impersonation**: Attempting to create a folder with a `userId` belonging to another user.
3. **Folder Scraping (Query Pollution)**: Attempting to query folders without restricting `userId` to the active user ID.
4. **ID Poisoning Attack**: Attempting to insert junk characters or overly large IDs into folder or note matches.
5. **Note Hijacking**: Writing a user-assigned note claiming an `ownerId` of another user.
6. **Relational Sync Pollution**: Setting a note's `folderId` pointing to a folder owned by another user.
7. **Created-at Drift**: Attempting to rewrite the immutable `createdAt` timestamp during note updates.
8. **Malicious Bloat Payload**: Appending un-whitelisted, shadow fields during update operations.
9. **Private Information Exfiltration**: General listing of notes without authenticated user restriction.
10. **Folder Ownership Escalation**: Modifying the parent identifier during note update to escape ownership limits.
11. **Impersonated Deletion**: Attempting to delete notes belonging to other active accounts.
12. **Block Overflow**: Injecting non-list data into the block structure array.
