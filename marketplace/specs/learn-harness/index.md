# Learning Harness

Use this spec when the repository exists to learn a subject, practice a skill, or build a
portfolio of exercises. A task is one learning round. The task record is the durable
source of truth; do not maintain a second checklist in a separate session file.

## 1. Define the round

Before starting, write in the task:

- The capability being practiced and why it matters now.
- One observable outcome that demonstrates it: an exercise, a small artifact, or an
  explanation another person can follow.
- The reference material and the assumptions or prerequisites under which it applies.
- Constraints: time, allowed tools, and what is deliberately out of scope.

Prefer one verifiable goal over a list of topics. If a goal cannot be demonstrated, split
it until it can.

## 2. Attempt before consulting the reference

Try the exercise or write the explanation first. Record where you got stuck, what you
tried, and what the attempt produced. Then read the reference and note:

- what confirmed the approach;
- what contradicted it;
- what to change on the next attempt.

Reading material is not evidence of mastery. Completion requires evidence from an
attempt.

## 3. Make the result reproducible

For every accepted outcome, record how to reproduce it from a clean checkout:

- the command or steps, including required versions and setup;
- sample inputs, fixtures, or starting state;
- the expected output, behavior, or explanation structure;
- how an independent person can attempt the same task without consulting the previous
  answer.

If reproduction needs a tool or account that is not available to the next person, record
that constraint and provide the closest offline alternative.

## 4. Save progress and evidence

When verification evidence exists, update the task body with three short parts:

- **Done** — what was produced or demonstrated.
- **Evidence** — commands run, outputs observed, files or links, and any remaining
  uncertainty.
- **Next** — the smallest next action, or "complete" when the goal is met.

Close a task only when the evidence supports the stated outcome. Leave unfinished goals
in the same status and resume by task ID later. If new evidence reveals a gap, append a
next action instead of rewriting the history that led to it.

## 5. Handoff

The next session or person should be able to:

- restate the learning goal in one sentence;
- reproduce the attempt from the recorded steps;
- distinguish verified behavior from unverified claims;
- start from the recorded next action without rereading the whole session.

Do not rely on chat history or external memory for any of these.

## Review checklist

- [ ] The goal names a capability, not an activity such as "read chapter 3".
- [ ] The evidence is observable and tied directly to the goal.
- [ ] Reproduction steps work outside the original session and state their prerequisites.
- [ ] Reference claims include a source and the conditions under which they apply.
- [ ] Unfinished work has a next action and remains findable by task ID.
- [ ] The handoff separates what was verified from what was assumed.

## Source and attribution

This spec paraphrases the goal-list, evidence, and handoff practices in the [Learning
Harness Engineering Template
Guide](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/resources/templates/index.md)
(MIT). It is not a verbatim copy of the upstream templates. See the [preset
README](./README.md) for adoption and upgrade instructions.
