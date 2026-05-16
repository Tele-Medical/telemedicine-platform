# AI Triage, Accessibility, and Operations

## Why these topics belong together

Claude grouped intelligence and accessibility in later phases, but they are also about how real people actually use the system.

This document covers:

- safe AI triage positioning
- multilingual and low-literacy design
- voice and IVR
- rollout and testing operations

## AI triage: what it should and should not do

Claude's core advice is right:

Do not build your own medical diagnosis engine from scratch for a competition.

Also do not claim your model "diagnoses patients."

That is unsafe and hard to defend.

## Best framing for AI in this project

Use AI as a `triage assistant` or `clinical support tool`.

Good use cases:

- summarize patient complaint
- convert free text or speech into structured symptoms
- suggest urgency category
- prepare draft note for doctor review
- help route non-urgent cases

Bad use cases:

- final diagnosis without clinician oversight
- autonomous prescription
- definitive emergency exclusion

## What triage means

`Triage` means deciding how urgently a case needs attention.

For your system, a simple triage output can be:

- emergency now
- consult within 24 hours
- routine consult
- home-care guidance plus warning signs

Even this must still be reviewed or governed carefully.

## Why model choice is not the main issue

Claude mentioned `Gemma 2B` and `Llama 3.1 8B`.

Those names are less important than the workflow around the model.

The real architecture questions are:

- where the model runs
- what patient data it receives
- what prompt restrictions exist
- what structured output format it returns
- who validates the output
- how unsafe outputs are handled

## Recommended AI workflow

1. user enters symptoms by text, voice, or assisted form
2. backend sends a constrained prompt to the model
3. model returns structured JSON, not free-form final advice
4. system maps output to a limited triage schema
5. clinician reviews before action when needed
6. system stores provenance that AI assisted the step

## Guardrails

Your AI layer should have:

- fixed output schema
- restricted scope
- forbidden diagnosis language where needed
- fallback to human review
- audit trail

## Human-in-the-loop

This means a human remains responsible for important decisions.

In healthcare, this is crucial.

Your AI should reduce workload, not replace accountability.

## Accessibility for low literacy

This project will fail in rural deployment if it assumes:

- strong English literacy
- confident typing
- familiarity with forms

So accessibility here means more than WCAG checklists.

It also means:

- understandable language
- assisted workflows
- clear audio support
- low cognitive load

## Multilingual design

You already know the main language targets are:

- Punjabi
- Hindi
- English

### Implementation rule

Do not hardcode text in UI components.

Instead:

- externalize strings
- use language files
- support translation updates cleanly

### Design rule

Do not just translate literally. Adapt for comprehension.

Simple wording is better than bureaucratic wording.

## Voice input

Voice input can help users who are not comfortable typing.

Possible uses:

- describe symptoms
- search patient
- navigate assisted flows

But voice should be treated as optional enhancement, not guaranteed capability.

Why?

- browser support varies
- noisy environments reduce accuracy
- medical terms can be recognized badly

## IVR

`IVR` means `Interactive Voice Response`.

This is the phone-call menu model where the user:

- calls a number
- hears audio prompts
- presses keys or speaks options

This is useful for:

- feature phone users
- very low literacy users
- appointment reminders
- basic triage routing

But IVR is not just code. It is also:

- telephony vendor integration
- call flow design
- prompt recording
- language testing
- support operations

## ASHA worker workflow

This is one of the most important real-world workflow additions.

An ASHA worker app can:

- register patients
- capture vitals
- assist teleconsultation
- collect follow-up information
- help with medicine pickup coordination

In many rural settings, assisted digital care is more realistic than pure self-service.

## Operations and rollout

Many good hackathon ideas fail because they ignore deployment reality.

You should plan for:

- user onboarding
- training
- support
- pilot sites
- test data
- demo contingency when network fails

## Pilot design

A good pilot story could be:

- one clinician
- one or two community workers
- one or two pharmacies
- limited patient group

Measure:

- consultations completed
- failed calls
- successful offline syncs
- prescription fulfillment success
- medicine lookup usefulness

## Metrics that matter

Good metrics for judges:

- reduction in failed trips
- time to doctor contact
- sync success rate
- percentage of consultations completed despite weak network
- medicine fulfillment match rate

## Demo strategy

Your competition demo should not rely on perfect internet.

Prepare:

- simulated weak-network mode
- offline record entry flow
- pharmacy stock lookup with freshness indicator
- visible fallback from video to audio or async mode

If your demo depends on flawless live networking, it is fragile.

## Common mistakes

### Mistake 1: positioning AI as the hero

In this product, the hero is the care workflow. AI is a helper.

### Mistake 2: translating UI without simplifying it

Language support is not enough if the workflow is still confusing.

### Mistake 3: ignoring assisted care paths

Patients do not always act alone in rural healthcare journeys.

## Strong presentation sentence

"We position AI as a constrained triage and documentation assistant, not a diagnosis engine, while the broader product is designed for multilingual, low-literacy, assisted-care workflows through voice support, field-worker enablement, and operationally realistic fallbacks."

## Key sources

- WHO AI for health governance: https://www.who.int/publications/i/item/9789240029200
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- W3C WCAG 2.1 overview: https://www.w3.org/WAI/standards-guidelines/wcag/
- ABDM overview: https://nha.gov.in/NDHM
