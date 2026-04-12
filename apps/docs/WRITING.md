# Documentation Style Guide

## Voice

ConfigBound is written by engineers, for engineers. The reader is smart. They can follow an argument and will notice if you're hedging.

Write with quiet authority. Not "this approach may help with drift"—"this approach eliminates drift." Not "you might want to consider"—"do this."

If we think something is the right approach, we say so and explain why.

## Theory before procedure

If a reader doesn't understand the model, the how-to is just a recipe they can't adapt when it doesn't fit. Explain why before how.

This doesn't mean long preambles. A single sentence establishing the mental model is often enough: "The config schema is the source of truth. Everything else is derived from it." Then the how-to makes sense.

## Name your tradeoffs

The most trusted documentation is honest about what the approach costs. Vite says production still needs bundling. Tailwind says your HTML gets verbose. That honesty is why they're trusted.

If ConfigBound's approach has a constraint, name it. A reader who hits the constraint without warning loses trust. A reader who was warned does not.

## Precision

Use the right word. Define it once, then rely on it. If we call it a "config schema," always call it a config schema—not "the config," "the schema," "the config file," and "the definition" across four pages.

Write for developers. Do not explain what a config file is. Do not define a callback.

## Derive, don't duplicate

If the API reference covers it, link to it. Don't re-explain it in prose. Prose is for context and rationale; the reference is for facts.

This is the same principle that governs the code: a second source of truth will diverge from the first.

## Sentence rhythm

Short sentences state facts. Longer sentences earn their length by carrying reasoning, qualifying a claim, or building toward a conclusion that wouldn't land without the setup.

Default to neither. Read it out loud. If it sounds like a brochure, shorten it. If it sounds like a telegram, add a sentence.

## What we don't do

- No filler. ("In this document, we will explain...")
- No hedging. ("might," "may," "could potentially," "in some cases")
- No passive voice when active is available.
- No documentation that exists only to prove the feature exists.
- No cheerleading. ("Exciting new feature!")
