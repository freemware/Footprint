# Footprint product direction

Footprint's strongest direction is **understand your data, then decide what stays**. It already has a local export explorer; that should be the core product story, supported by live privacy checks and a careful cleanup workflow.

## Competitive baseline

Block Party's Chrome Web Store listing describes privacy scans, expert recommendations, automated setting changes, a protection score, tagged-content review, bulk deletion, connection management, notification controls, and coverage across 12+ platforms. These are existing competitor features, not defensible differentiation for Footprint.

Source: https://chromewebstore.google.com/detail/block-party-%E2%80%94-deep-clean/hefhjoddehdhdgfjhpnffhopoijdfnak (reviewed October 21, 2026). This is a listing-based comparison, not a hands-on audit or a claim that Block Party lacks any unlisted feature.

## Shipped in the proposed 0.4.0 changes

- **Post-first review:** larger post images, saved captions when Facebook exposes them, original-post links, expanded previews, and a deliberate Keep decision. No third-party post embeds run in the dashboard.
- **A portable inventory:** export discoveries, source, timestamp, and coverage status as JSON. The export does not contain internal worker-tab identifiers.
- **Coverage you can inspect:** scan both Facebook tagged-activity sources, deduplicate identified posts, save checkpoints, continue paused scans, and distinguish reaching a source's end from proving all historical tags were exposed.
- **A friendlier starting point:** light lavender, mint, and peach; a working sample-data flow; clearer local-import instructions; consistent keyboard focus and reduced-motion behavior.

These improve Footprint's workflow. They are not claims of exclusive features.

## Next differentiation bets (not implemented in this change)

1. **A data receipt for every recommendation.** Show the exact export file/field or live reading that supports it, when it was observed, what can be changed, and what remains after the change. Start with advertisers, off-platform activity, inferred interests, and tagged-content exposure.
2. **Compare two exports locally.** Show new advertisers, new inferred interests, and additions/removals between two user-selected export snapshots. Do not upload the exports or claim a missing record proves deletion from Meta's servers.
3. **An exposure map.** Connect public contact information, public posts, and location clues with explicit evidence and uncertainty. Explain realistic paths to unwanted discovery rather than inventing a single opaque safety score.
4. **A review queue with personal rules.** Save filters such as older-than-year or mentions-of-school for review. Keep destructive actions behind a preview and approval; do not silently delete or remove tags.
5. **One privacy history across sources.** Link export observations, live checks, and confirmed changes on a dated timeline, while preserving the distinction between facts, inferences, unverified changes, and unsupported settings.

Prioritize data receipts and local export comparison before racing to match every competitor platform.
