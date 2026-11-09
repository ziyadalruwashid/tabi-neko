---
name: mockups
description: Make 2–3 design mockups of a screen change for the owner to choose from, drawn on top of the real app. Use whenever the owner asks for a visible change or says "make mockups".
---

# Mockups

The owner picks the design before anything is built.

1. **Use the real app as the canvas.** Open it as in the `test-app` skill
   and change the DOM and CSS in the page with `page.evaluate`: hide what
   goes, inject the new parts with the real classes and the tokens from
   `DESIGN.md`. This looks exactly like the app and shows real places and
   photos. Hand-drawn HTML is only for screens that don't exist yet.
2. **Make 2–3 options** that really differ (A, B, C). Show a state that
   matters too (a switch turned on, another tab picked).
3. **Make one picture:** the screenshots side by side, each labelled
   ("A · Restaurants first"), phone width, 2× scale. Send it to the owner.
4. **In the message,** say what each option changes in one or two lines,
   recommend one, and ask which to build.
5. **Build exactly the picked option.** If the owner mixes options
   ("A but with B's chips"), build that.
