# Name matching and signature detection

## Why the font is not the identity

The original idea was to find names by looking for Garamond Bold 16 pt. That is
useful as a **layout hint**, but it cannot be the identity:

- Scanned PDFs have no text layer, so there is no font data at all.
- Word/Canva may embed `Garamond-Bold`, `Garamond,Bold`, a subset name like
  `ABCDEF+Garamond-Bold`, or substitute another font.
- "Bold" can be a fake stroke rather than a bold font.
- Anyone can copy a style, and headings can accidentally match it.
- Names are not unique; two people can share the same printed name.

E-Docs therefore matches the **whole printed name** against the account names.
The font family and size are now a **candidate gate**, not the identity:

1. A line is only considered when it is **Garamond-like, bold, and 14–18 pt**.
   Signature labels are **not required** — many documents have none.
2. **Underlining is allowed.** It is an extra style, not a fourth requirement
   and not a disqualifier. A line that is Garamond-like, bold, 14–18 pt and
   underlined is included like any other.
3. Everything else (body text, headings, titles, captions, small print) is
   dropped.
4. If the PDF does not expose a usable font name and only has generic CSS
   metadata, the system shows **Manual only**. It does not treat `serif` or
   `sans-serif` as Garamond-like, and it does not guess by size alone.

### Where the family comes from

`textContent.styles[...].fontFamily` is only pdf.js's generic CSS fallback. It
is normally `serif` or `sans-serif`, even for an embedded subset whose real name
is `BCDKEE+Garamond-Bold`. E-Docs reads the real name from the pdf.js font
object instead:

```js
const font = page.commonObjs.get(item.fontName);
const family = String(font?.name ?? "").replace(/^[A-Z]{6}\+/, "");
// BCDKEE+Garamond-Bold -> Garamond-Bold
```

`page.getOperatorList()` is awaited before that lookup because
`commonObjs.get()` throws until the font has been resolved. The lookup and the
property reads are also wrapped in `try/catch`.

pdf.js v6 only exports the `name` property when `fontExtraProperties: true` is
passed to `getDocument`. E-Docs enables it in `pdfLoadingOptions()`. Older
pdf.js versions already expose the name; unknown options are ignored there.

Bold is accepted when the font object reports `bold`, or when the resolved name
contains `Bold`, `Semibold`, `Demi`, or `Black`. The strict gate is still:

```js
family.toLowerCase().includes("garamond") &&
bold &&
fontSize >= 14 &&
fontSize <= 18
```

Underline is still ignored; it neither helps nor disqualifies.

The real-pdf.js regression fixture is
`tests/fixtures/real-garamond-names.pdf`. It resolves `BCDKEE+Garamond-Bold` at
16 pt for `Maria Santos` and `Pedro reyes`, and rejects `Head of the City
college` (CenturyGothic-Bold, 11 pt). The test is
`tests/documents/pdfFontDetection.test.js`. The public sample also auto-detects
its three Garamond Bold 16 pt names with the same code.

The review screen shows **Garamond Bold · 14–18 pt** or **Manual only**. The
name match still decides who signs.

## 1. Finding candidate names in the PDF

`src/services/documents/pdfDetection.js`:

1. Reads the PDF with pdf.js (the file stays in the browser during detection).
2. Resolves the real font object name (`commonObjs.get(...).name`) and strips
   the subset prefix; `textContent.styles[...].fontFamily` is only a generic
   fallback.
3. Groups text runs into lines using their position and font size.
4. Removes common labels such as `Signature over Printed Name:`,
   `Approved by:`, `Conforme`, `Prepared by`, `Noted by`.
5. Rejects lines that contain dates, emails, digits, addresses or header words
   (`Republic`, `Philippines`, `Department`, `Date`, etc.).
6. Splits lines that contain multiple names separated by `AND`, `&` or `/`.
7. Produces non-overlapping name windows (2–7 tokens), preferring the longest
   plausible window. This stops `JUAN DELA CRUZ DATE` from also producing
   `JUAN DELA` and `DELA CRUZ`.
8. Applies the **strict style gate**: Garamond-like family, bold, 14–18 pt,
   anywhere on the page. Signature labels are optional, and underlining is
   allowed.
9. Orders the survivors by page and position.
10. Places a default signature box in the blank space directly above the printed
    name. The uploader can drag and resize it.

The uploader always confirms the result. Detection is a proposal, never an
automatic send. The exact rule is `pickStyleCandidates()` in
`src/services/documents/nameDetectionRules.js`.

## 2. Normalization

Both the detected name and the account names go through
`app_private.normalize_name()`:

- uppercase
- accents removed (`unaccent`)
- punctuation replaced with spaces
- repeated spaces collapsed
- trimmed

Examples:

| Input | Normalized |
| --- | --- |
| `Dela Cruz, Juan` | `DELA CRUZ JUAN` |
| `JUAN M. DELA CRUZ` | `JUAN M DELA CRUZ` |
| `María Santos` | `MARIA SANTOS` |
| `O'Connor` | `O CONNOR` |

Two derived forms are stored on each profile:

- **token-sorted**: `CRUZ DELA JUAN` (handles "Last, First" vs "First Last").
- **core**: single-letter tokens removed (`JUAN DELA CRUZ` from
  `JUAN M DELA CRUZ`), plus a sorted core.

## 3. The score

For each pair, E-Docs takes the **maximum** of six signals:

1. Levenshtein similarity on the normalized full name.
2. Levenshtein similarity on the token-sorted name.
3. Trigram similarity (`pg_trgm`) on the normalized full name.
4. Levenshtein similarity on the core name (middle initials removed).
5. Levenshtein similarity on the sorted core.
6. Trigram similarity on the core.

Levenshtein similarity = `1 - distance / max(length)`.

The maximum means a name can match through spelling, letter order, or the
middle-initial variant:

| Document | Account | Likely result |
| --- | --- | --- |
| `JUAN DELA CRUZ` | `Dela Cruz, Juan` | 1.00 (sorted) |
| `JUAN M. DELA CRUZ` | `Juan Dela Cruz` | 1.00 (core) |
| `JUAN DELA CRUS` | `Juan Dela Cruz` | ≈0.92 (Levenshtein) |
| `MARIA SANTOS` | two identical accounts | 1.00 each → manual choice |
| `JUAN DELA CRUZ` | `Pedro Reyes` | below 0.75 → no match |

## 4. The 90% rule

- `find_signatory_matches()` returns the top 5 candidates at **0.75+** so the
  uploader can see near misses.
- Only candidates at **0.90+** can be selected.
- If the top two are within **0.03**, the UI does not auto-select; the uploader
  must choose the right person.
- Editing the printed name clears the previous match and requires "Find
  account" again.
- `finalize_document()` recomputes `name_match_score()` for every signatory,
  updates the stored score, and refuses to send below 0.90. The client cannot
  fake a score.

## 5. The signature gate

- A signature is uploaded or drawn once in **Profile & signature**. The image
  is stored privately at `signatures/<user-id>/signature-<time>.png`.
- `claim_signature()` checks `profiles.signature_path is not null`. If it is
  missing, the approval fails with `ED001` ("Upload your signature before
  approving"). The UI disables the button and links to the profile.
- The Edge Function stamps the stored image; the approver does not draw at
  signing time.
- The signature is stamped only by the server, after the document hash is
  re-verified against the database.

## 6. Signature box placement

- The box is stored as normalized coordinates (`page`, `x`, `y`, `width`,
  `height`, all 0–1) relative to the displayed page.
- The default field is centered horizontally on the printed name and sits just
  above the glyphs; its bottom edge is dropped by about **10 px at 16 pt**, so
  the field and stamped signature overlap the printed name as requested.
- Its width starts at roughly **3:1** relative to its height; a long printed
  name can stretch it to at most **6:1**. It is not a fixed 28%-of-page box.
- The uploader can drag/resize the box. Arrow keys move it; Shift + arrows
  resize it.
- The Edge Function converts the box to PDF points, trims transparent margins
  from the stored signature PNG, then scales it up or down to fit the field
  while preserving its aspect ratio. It centers the image inside the field, so
  the stamped signature lines up with the location the uploader approved.

## 7. Known limits

- **Scans**: no text layer → add names manually.
- **Hidden font names**: if the PDF has no usable font object name and only
  generic CSS metadata, detection returns zero candidates; add names manually.
- **Handwritten names**: not detected.
- **Nicknames**: "Bob" vs "Robert" will not match; the uploader adds manually.
- **Rotated pages**: rejected at scan time. Rotate the PDF to 0° and re-upload
  so the signature box and the server stamp use the same coordinate space.
- **Non-Latin names**: normalization keeps alphanumerics, but the matching
  quality depends on the database locale and `unaccent`. Test with your real
  names.
- **Duplicate names**: the system deliberately stops and asks a human.
- **Legal weight**: the hash + audit trail is a strong record, but it is not a
  CA-issued PAdES signature. Add a qualified provider if the document type
  requires it.

## 8. Optional future hardening

If the organization wants a deterministic identifier in addition to the name,
print a unique code on the name line:

```text
JUAN DELA CRUZ · ED-0042
```

Then match `ED-0042` first and use the name as a secondary check. This is not
required by the current build; the 90% name matcher is the identity path the
project asked for.
