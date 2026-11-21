# Implementation plan

1. Review the three child plans. Start the task protocol child first and use it to migrate the checked-in MemeRig runtime and records.
2. Establish the blank init file contract in the project-discovery child, then integrate and publish the presets through the template child. Work on preset content can proceed independently from runtime implementation after review. Apply shared initializer edits in order.
3. In a fresh MemeRig clone with Python available, exercise a real collaborative task across two processes and verify it without a platform hook or a global installation. In isolated projects, use the packaged initializer to test the four offline choices. For project discovery, use multiple temporary clones and submodule fixtures.
4. Verify update on a representative existing project with records, local edits, and task tracking rules. Record expected changes, retained artifacts, and rollback results in the child tasks.
5. Review the parent acceptance criteria and resolve any remaining failures before marking the parent complete.
