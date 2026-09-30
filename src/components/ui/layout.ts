/**
 * Page containers. Every page that shows a table or list uses the same width, centring and side padding, so the table's
 * left edge and width are identical from page to page and do not move when filters change.
 *  - `min-w-0` lets the container shrink inside its flex parent instead of being pushed wider by its content.
 *  - `w-full` (never `w-fit` or `mx-auto` alone) pins the width to the available space up to the maximum.
 */
export const LIST_PAGE = "mx-auto w-full min-w-0 max-w-[90rem] space-y-4 px-4 py-4 sm:px-6 sm:py-6";
