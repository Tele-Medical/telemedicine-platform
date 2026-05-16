# Real-Time Medicine Inventory and Supply Chain

## Why this pillar matters

In healthcare, a consultation is incomplete if the patient cannot actually obtain the prescribed medicine.

That is why medicine inventory is not an "extra feature." It completes the care pathway.

Your system should connect:

- doctor prescription
- pharmacy stock
- patient pickup status
- reorder visibility

## What "real-time" should mean in your project

Be careful with this phrase.

In a perfect digital system, real-time means the displayed stock exactly matches current physical stock at every moment.

In rural settings, that is often unrealistic because:

- stock may be updated manually
- devices may be offline
- pharmacists may enter data later

A safer and more honest meaning is:

- near-real-time
- latest synced stock state
- freshness indicator shown clearly

This is more defensible.

## Main workflows

Your inventory system should support four core flows.

### 1. Stock intake

When medicines arrive, the pharmacy records:

- medicine
- batch or lot number
- quantity
- expiry date
- supplier or source
- received date

### 2. Stock dispensing

When a prescription is filled, the system reduces available stock.

### 3. Stock adjustment

Manual correction for:

- damaged items
- expired items
- counting mistakes

### 4. Reorder or shortage alert

When stock goes below threshold, the system flags it.

## Important concepts

## Medicine master

This is the standardized medicine catalog used across the platform.

It should include:

- generic name
- brand name if needed
- strength
- dosage form
- unit
- standard codes if available

Why this matters:

Without normalization, one pharmacy may enter:

- Paracetamol 500
- PCM 500
- Acetaminophen 500

and your search becomes unreliable.

## Generic name normalization

This means you store a standardized representation for matching and search.

Usually the safest primary key is the generic name plus strength plus dosage form.

Example:

- `Paracetamol 500 mg tablet`

## Batch or lot tracking

A `batch` is a production lot of a medicine.

Tracking by batch helps with:

- expiry monitoring
- recalls
- stock accuracy

In healthcare systems, batch-level tracking is much better than only total quantity.

## Expiry tracking

Each stock batch should carry an expiry date.

This allows:

- near-expiry alerts
- dispensing FEFO logic

## FEFO

`FEFO` means `First Expiry, First Out`.

This means the batch expiring sooner should generally be dispensed first.

This reduces wastage.

## Stock on hand

`Stock on hand` means the currently available quantity in the pharmacy.

Do not confuse it with:

- received quantity
- reserved quantity
- dispensed quantity

## Reserved stock

When a prescription is routed to a pharmacy, you may temporarily reserve items so another user does not immediately take the same stock.

This reservation should have:

- quantity
- hold time
- expiry time

## Fulfillment status

A prescription should move through states such as:

- sent
- accepted
- partially available
- ready for pickup
- dispensed
- cancelled

This helps both patients and clinicians.

## Suggested database entities

You will likely need:

- `pharmacies`
- `medicine_master`
- `stock_batches`
- `stock_movements`
- `prescriptions`
- `prescription_items`
- `fulfillments`
- `reorder_requests`

## Stock movement ledger

One of the best patterns is to maintain a movement ledger.

Each change creates a movement record:

- receive
- dispense
- adjust
- expire
- transfer

Why this is good:

- auditable
- easy to debug
- supports analytics

Then current stock can be derived or maintained as a summarized value.

## Searching nearest available pharmacy

This requires several kinds of data:

- pharmacy location
- medicine search normalization
- stock quantity
- freshness timestamp

Your search logic can be:

1. find nearby pharmacies by distance
2. filter by medicine match
3. filter by positive available quantity
4. sort by distance and freshness

Show:

- pharmacy name
- distance
- available quantity or availability state
- last updated time

## Why freshness matters

If one pharmacy last synced 5 minutes ago and another last synced 3 days ago, those are not equally trustworthy results.

Your UI should show:

- `Updated 5 min ago`
- `Updated yesterday`
- `Last sync unknown`

This makes the system transparent.

## Prescription routing

After consultation:

1. doctor issues prescription
2. system identifies candidate pharmacies
3. patient chooses one or system suggests nearest good option
4. pharmacy confirms stock
5. patient gets readiness message

This is the care-completion loop.

## Partial fulfillment

Sometimes only part of the prescription is available.

Your system should support:

- partial availability
- alternate nearby pharmacy
- manual substitution review

## Substitution engine

Claude proposed branded-to-generic substitution.

This can be useful, but be careful.

You should frame it as:

- pharmacist or clinician reviewed substitution suggestion
- not automatic unsupervised medication replacement

Substitution rules depend on:

- generic equivalence
- dosage form
- strength
- local regulation
- doctor intent

## Offline pharmacy operation

Pharmacy portals may also experience unstable connectivity.

So the inventory system should support:

- local draft stock entry
- queued sync
- delayed reconciliation

This means pharmacy workflows may also use offline-first ideas, though often less extensively than patient records.

## Analytics possibilities

Even a demo system can show value with analytics such as:

- top out-of-stock medicines
- fast-moving medicines
- upcoming expiries
- facility shortage trends

This helps the project look system-oriented rather than screen-oriented.

## Integration reality

A full government or wholesale supply integration is probably too large for a student MVP.

So for the competition, it is acceptable to:

- implement internal stock management fully
- mock external supplier APIs
- show how low-stock alerts would trigger reorder requests

That is a realistic boundary.

## UI recommendations

Pharmacy UI should prioritize speed and clarity:

- large search box
- medicine barcode or QR optional later
- simple receive/dispense actions
- clear expiry warnings
- low stock markers

Avoid over-designed dashboards that slow daily use.

## Common mistakes

### Mistake 1: storing only a single quantity per medicine

That loses batch and expiry detail.

### Mistake 2: treating medicine names as free text everywhere

That breaks search and matching.

### Mistake 3: claiming exact truth without freshness metadata

This reduces trust when stock mismatches happen.

## Strong presentation sentence

"Our medicine layer maintains a normalized medicine catalog, batch-aware stock ledger, prescription routing workflow, and freshness-based nearby availability search, so the patient can move from consultation to actual medicine access with fewer failed trips."

## Key sources

- OpenLMIS documentation entry point: https://openlmis.atlassian.net/wiki/spaces/OP/pages/2067720193/OpenLMIS+Docs
- National List of Essential Medicines portal: https://pharmaceuticals.gov.in/national-list-essential-medicines
- WHO Essential Medicines overview: https://www.who.int/teams/health-product-policy-and-standards/essential-medicines-and-health-products/policy-access-and-use/essential-medicines-lists
