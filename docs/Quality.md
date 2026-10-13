# Feature Quality and Product Acceptance

## Planning and approval

Follow the workflow in [AGENTS.md](../AGENTS.md): request, investigation and clarification, proposed plan, explicit user approval, implementation, verification, and review/handoff. Plan approval is separate from code review and Product Owner acceptance.

Before implementation, agree on observable acceptance criteria, scope, dependencies, and applicable automated and manual acceptance tests. The Product Owner (PO) leads the acceptance-test initiative with Quality Engineering (QE); developers identify technical risks and constraints.

## Splitting feature work

A user-facing feature may be split into frontend, backend, database, or testing tasks. Link these tasks to the parent GitHub issue/user story and record dependencies and integration expectations.

The developer responsible for the parent feature coordinates its sub-tasks and dependencies. Completing a technical task does not make the parent feature Done. All required portions must be integrated and evaluated together against the parent feature's acceptance criteria.

## Merge gate

A PR is eligible to merge after required CI checks pass and required code review is complete. Include relevant tests, migrations, safe configuration templates, documentation, and evidence of local checks. Use the [PR template](../.github/pull_request_template.md).

PO approval of every developer PR is not a merge requirement. Product acceptance occurs when the integrated feature is available to evaluate.

## Definition of Done for a feature

A parent feature/user story is Done only when:

- Its agreed acceptance criteria are satisfied.
- Applicable automated and manual tests pass.
- Required lint, build, system, and migration checks pass.
- Required code review and CI are complete.
- All required frontend, backend, database, and testing work is integrated.
- Relevant documentation is updated.
- Acceptance testing is complete, with results and unresolved findings recorded.
- The PO accepts the finished feature.

QE works with the PO to define and verify acceptance tests. Record acceptance evidence and the PO's decision on the parent GitHub issue. Move the issue to Done only after PO acceptance. Failed acceptance tests, blocked required checks, or missing integration keep the feature open.

## Verification evidence and handoff

Record which checks ran, their results, the environment used, and any blocked or unperformed checks. Use synthetic data and exclude credentials and personal information from evidence.

Mocked frontend HTTP tests verify client behavior, not communication with a running Django server. Verify the integrated application separately, including relevant permissions, validation failures, and user-visible states.

An agent may hand off an implemented change with a clearly stated verification blocker. Label it as awaiting verification or acceptance rather than declaring the feature Done. Identify the remaining action and its responsible role.
