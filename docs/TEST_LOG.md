# Test log (fill in with your own real results)

Evidence of testing and prompt refinement earns marks. Run each test in **Live AI** mode, paste the result summary, and record how long it took you manually vs with WorkMate (including review).

| Date | Feature | Input (short) | Prompt version | What the output got right | What was wrong / fixed | Manual time | WorkMate time |
|------|---------|---------------|----------------|---------------------------|------------------------|-------------|---------------|
|      | Email   |               | v1             |                           |                        |             |               |
|      | Email   |               | v3             |                           |                        |             |               |
|      | Meeting |               | v1             |                           |                        |             |               |
|      | Meeting |               | v3             |                           |                        |             |               |
|      | Planner |               | v3             |                           |                        |             |               |
|      | Research|               | v3             |                           |                        |             |               |
|      | Chat    |               | v3             |                           |                        |             |               |

## Automated tests
`node tests/engine.test.js`: 13 tests covering email, meeting extraction, planner scheduling (lunch, hours, weekends, overflow), research, chat routing and PII detection.
