---
description: Why the ConfigBound schema is the single authoritative source for configuration documentation.
---

# Schema as the Source of Truth

This page describes how ConfigBound applies the [Docs as Code](./docs-as-code.md) principle to configuration management.

## The problem with separated config documentation

In most projects, configuration is defined in one place and documented somewhere else — an env var table in the README, a Confluence page, a comment block in a `.env.example` file. This works until someone adds a variable, changes a default, or tightens a validation rule and forgets to update the docs. The config and the docs drift apart silently.

Validation logic drifts too: the code checks that a value is a valid port number, but that constraint lives nowhere near the human-readable description of what the variable is for.

## What ConfigBound collocates in the schema

The schema puts everything needed to describe a config item in one place, in code:

- **Structure** — sections and items that mirror your application's logical organization
- **Type and validator** — what values are acceptable, expressed as a Zod schema
- **Default** — what happens when nothing is set
- **Example** — a representative value, used in generated output
- **Sensitive flag** — whether the value should be masked in logs and exports
- **Description** — human-readable intent, co-located with the definition

```typescript twoslash
import { configItem } from "@config-bound/config-bound";
import { z } from "zod";
// ---cut---
const schema = {
  port: configItem<number>({
    default: 3000,
    validator: z.number().port(),
    example: 8080,
    description: 'The port the server listens on'
  })
};
```

There is no separate place to maintain these pieces of information. They live together, or they don't exist.

## The consequence: docs can't drift

When the schema is the source of truth, documentation generated from it stays accurate by construction. There is no "remember to update the wiki" step — if the schema changes, the exported output changes with it.

Compare the alternative: an env var table in a README, maintained by hand, that nobody updates when a default changes in production.

## Schema export as a natural output, not an add-on

Because the schema already contains everything needed to describe the configuration, exporting it is serialization of what already exists. The `@config-bound/schema-export` package produces JSON, YAML, or `.env.example` output that downstream consumers can use however they need:

- Generating README sections or operator runbooks
- Validating environment variables in CI
- Powering IDE autocomplete or tooling
- Building configuration UIs

The schema does not need to change to support any of these use cases. The information is already there.
