# PROMPT FOR GOOGLE ANTIGRAVITY AGENT

**Copy and paste the text below directly into Google Antigravity:**

***

**System Context & Role:**
You are Google Antigravity, acting as a Principal Frontend Engineer and Lead UI/UX Designer. You have access to the Stitch MCP server to generate production-ready React/Tailwind code. We are building a "Low-Bandwidth, Offline-First, Multilingual Telemedicine Platform" designed for rural healthcare in India (Nabha). 

**Your Mission:**
I want to build a truly modern, "human-like," and visually stunning Progressive Web App (PWA). It should not look like a generic, sterile "AI-generated" dashboard. It needs to balance high-end aesthetic polish with strict accessibility and offline-first functionality.

**Step 1: Context Gathering (Do this first)**
1. **Read the implementation plan:** Read the `frontend_implementation_plan.md` file in this workspace. Pay special attention to the "Backend API Integration Map" section to understand the exact data structures and endpoints you will be working with.
2. **Review the old UI (What NOT to do):** Look at this previous Stitch project: https://stitch.withgoogle.com/projects/2061155407628386366?pli=1. Analyze it briefly. I do not like this because it feels too "AI-generated" and generic. We need to move away from this style.
3. **Review the Target Aesthetic (What TO do):** Look at this Dribbble shot: https://dribbble.com/shots/23019137-Healthcare-App. This represents the visual target: soft shadows, high-contrast typography, warm/calm colors, and a very human-centric, modern feel.

**Step 2: UI/UX Design Directives for Stitch MCP**
When generating UI components via Stitch, strictly adhere to these design principles to achieve the "Crazy Modern but Human" look:
*   **Mobile-First PWA:** Design strictly for mobile screens first. Use a sticky bottom navigation bar with clear, rounded icons (like iOS Health or modern banking apps).
*   **Color Palette:** Avoid clinical, sterile hospital blues. Use a calming, warm palette. Think "Sage Green", "Soft Teal", "Warm Off-White (Cream) backgrounds", and deep slate/charcoal for text instead of pure black.
*   **Typography:** Use a modern, highly legible geometric sans-serif (like Inter or Plus Jakarta Sans). Ensure text scaling is large enough for low-literacy users or older patients.
*   **Depth & Elevation:** Use very soft, diffused drop shadows to make cards "float" slightly off the background. Lightly utilize glassmorphism (translucency and background blur) for sticky headers or modals, but ensure text contrast remains WCAG AA compliant.
*   **Touch Targets:** Ensure all buttons, list items, and interactive elements are large, rounded (e.g., `rounded-2xl` or `rounded-full` in Tailwind), and easily tappable for users who may not be tech-savvy.
*   **Offline-First Feel:** Design beautiful "Skeleton Loaders" for when data is fetching, and elegant "Offline Syncing" indicator badges that look like natural parts of the UI, not error alerts.

**Step 3: Execution Strategy**
Using the Stitch MCP server, I want you to start generating the frontend components in the following order, ensuring they map perfectly to the backend endpoints listed in the implementation plan:
1.  **The Shell:** A reusable mobile PWA layout with a sticky bottom nav and a top header containing an offline/sync status badge.
2.  **Auth Flow:** A beautiful, modern OTP login screen with smooth transitions.
3.  **Patient Dashboard:** A home screen featuring upcoming appointments (horizontal scrolling cards), recent vitals, and a clear "Consult Doctor" Call-to-Action.
4.  **Doctor Teleconsultation Room:** A split-screen mobile view showing the video feed at the top and swipeable patient records/prescription composer at the bottom.

Please acknowledge that you have read the files and analyzed the Dribbble link, and then present your proposed color palette and typography choices before you begin generating the first Stitch component.

***
