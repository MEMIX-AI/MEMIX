// The two mandatory declaration checkboxes (CLAUDE.md POSISI LEGAL #2 —
// GERBANG DEKLARASI). Exact wording shown to the uploader and snapshotted
// verbatim into UploadDeclaration.declarationText at submit time, so a
// later wording change never rewrites what someone actually agreed to.
export const OWNERSHIP_DECLARATION_TEXT =
  "I own this content or have the right to share it. I am not uploading content that infringes someone else's copyright.";

export const TOS_DECLARATION_TEXT =
  "I agree to the Terms of Service and Content Policy.";

// Bump this whenever the ToS/Content Policy at /tos materially changes.
// Past UploadDeclaration rows keep whatever version was current when
// accepted — they are never rewritten (paper trail).
export const CURRENT_TOS_VERSION = "1.0";
