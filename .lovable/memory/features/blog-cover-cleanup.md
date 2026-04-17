---
name: Auto-cleanup okładek bloga
description: Edge function delete-blog-cover usuwa stare okładki ze storage przy zapisie/usunięciu wpisu
type: feature
---
Edge function `delete-blog-cover` (admin-only, JWT + has_role('admin')) usuwa pojedynczy plik z bucketa `blog-covers`. Bezpieczna whitelist: parsuje URL i usuwa tylko jeśli ścieżka pasuje do `/storage/v1/object/public/blog-covers/...`. Zewnętrzne URL-e są ignorowane (no-op success).

**Wywoływana z:**
- `AdminPostEditor.saveMutation` — po update wpisu, jeśli `cover_image_url` się zmienił względem `existingPost.cover_image_url`
- `AdminDashboard.deleteMutation` — po skasowaniu wpisu, jeśli miał okładkę w naszym buckecie

**Why:** Zapobiega narastaniu osieroconych plików w storage przy podmianach okładek przez admina.
