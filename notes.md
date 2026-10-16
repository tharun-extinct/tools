Short answer: the linter flagged inline styles, so I moved them into a stylesheet for maintainability, accessibility, and performance.

Why external CSS (benefits):
- Single source of truth: easier to update styles used in multiple places.
- Accessibility: added an `sr-only` helper and better semantics for the file input.
- Linter/standards: avoids inline styles (fixed the reported errors).
- Reuse & consistency: classes (`upload-icon`, `upload-title`, etc.) can be reused.
- Caching & performance: the browser can cache CSS separately.
- Easier theming, debugging, and testing (no spread-out style attributes).

What I changed (quick links):
- CSS classes and helpers added in styles.css.
- HTML updated to use those classes and an accessible label in background_remover_app.html.

If you prefer to keep everything in one file (single-file app), I can inline the stylesheet back into the HTML head while keeping the semantic classes and accessibility fixes — want me to do that?
