---
description: How ConfigBound applies the Docs as Code principle to keep configuration documentation accurate.
---

# Docs as Code

## What "Docs as Code" means

Docs as Code keeps documentation in the same repository as the code it describes, subject to the same review, versioning, and tooling.

Docs colocated with the code ship with every change. An external wiki cannot make the same guarantee.

## Why manual documentation fails

Docs managed separately from code drift the moment they're written. A parameter gets added, a default changes, a feature disappears. Nobody updates the page. Broken docs don't fail a build, so incorrect documentation ships silently or isn't updated at all.

## The core principle: derive, don't duplicate

The code is the source of truth. Function signatures exist there. Config defaults are declared there. Valid enum values are defined there. Documenting this information separately creates two sources of truth, and they will diverge. Derive documentation from the code: treat the code as the single authoritative source and generate documentation from it, not alongside it.

This is not about eliminating human authorship. Some content can be derived from code; some requires a human to write. The closer docs are to the code they describe, the more accurate they stay. Writing kept with the code can't silently drift: if you change the code, you're already looking at the description. Writing in a separate wiki goes stale without anyone noticing.

## What this looks like in practice

- TSDoc comments in source code generate the API reference automatically
- Config schemas generate operator documentation through schema export
- CI pipelines lint prose, validate links, and catch broken references before they ship

Each of these creates a feedback loop. If a TSDoc comment is missing, the API reference is incomplete and that gap is visible. If a link breaks, CI catches it. The docs stay accurate because the system makes inaccuracy visible.

## The limits of Docs as Code

Docs as Code addresses structured, factual content. It does not eliminate the need for human-authored explanation. Tutorials, conceptual overviews, and design rationale require a person to write them. No amount of code introspection produces a good getting-started guide.

A Docs as Code project still needs someone to care about the documentation. The principle reduces the cost of keeping factual content accurate; it does not make documentation automatic.

## How ConfigBound applies this

ConfigBound's API reference is generated from TSDoc comments in the source. For users of the library, the config schema itself becomes the source of documentation for their application's configuration. See [Schema as the Source of Truth](./schema-source-of-truth.md) for how that works in practice.
