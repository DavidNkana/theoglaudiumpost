import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Preview from "@/views/Admin/Announcements/Partials/Preview.vue";

/* ------------------------------------------------------------------ */
/* Preview.vue is a purely presentational component. It imports no     */
/* external boundaries (no services, no router, no composables) and    */
/* exposes three pure helpers (getStatusBadgeClass, formatDate,        */
/* formatContent) that are exercised through the rendered template and */
/* its branches. We drive every v-if/v-else and every helper branch.   */
/* ------------------------------------------------------------------ */

const mountPreview = (announcement) =>
  mount(Preview, {
    props: { announcement },
  });

describe("Preview.vue", () => {
  it("renders nothing when announcement is null (root v-if false branch / default prop)", () => {
    const wrapper = mountPreview(null);

    // Root `v-if="announcement != null"` is false -> empty render.
    expect(wrapper.find(".article-preview").exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("uses the default prop (null) when no announcement is supplied", () => {
    const wrapper = mount(Preview);

    expect(wrapper.find(".article-preview").exists()).toBe(false);
  });

  it("renders a published announcement with image, category and long content", () => {
    // content longer than 500 chars to drive formatContent's truncation branch.
    const longContent = "<p>" + "a".repeat(600) + "</p>";

    const announcement = {
      id: 42,
      title: "Big News",
      status: "published",
      publish_date: "2026-01-01T10:00:00Z",
      expire_date: "2026-02-01T10:00:00Z",
      category: { name: "Sports" },
      image: { file: "https://example.com/cover.png" },
      content: longContent,
    };

    const wrapper = mountPreview(announcement);

    // Root v-if true branch.
    expect(wrapper.find(".article-preview").exists()).toBe(true);

    // Title rendered.
    expect(wrapper.find(".article-title").text()).toBe("Big News");

    // status == "published" ternary true branch -> "Published" label.
    expect(wrapper.find(".article-status .badge").text()).toBe("Published");
    // getStatusBadgeClass("published") -> "badge bg-success"
    expect(wrapper.find(".article-status .badge").classes()).toEqual(
      expect.arrayContaining(["badge", "bg-success"])
    );

    // formatDate truthy branch for both publish_date and expire_date.
    const dateText = wrapper.find(".article-date").text();
    expect(dateText).toContain("Jan 1, 2026");
    expect(dateText).toContain("Feb 1, 2026");

    // category?.name truthy branch.
    expect(wrapper.find(".article-category").text()).toContain("Sports");

    // image v-if true branch -> cover rendered with src/alt.
    const img = wrapper.find(".article-cover img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/cover.png");
    expect(img.attributes("alt")).toBe("Big News");

    // content v-if true branch -> excerpt rendered; formatContent truncates
    // long content to 500 chars + "..." (HTML stripped via temp div).
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.exists()).toBe(true);
    expect(excerpt.text().endsWith("...")).toBe(true);
    expect(excerpt.text()).toBe("a".repeat(500) + "...");
  });

  it("renders a draft announcement without image, without category, with short content", () => {
    const announcement = {
      id: 7,
      title: "Draft Item",
      status: "draft",
      publish_date: null, // formatDate falsy branch -> "-"
      expire_date: undefined, // formatDate falsy branch -> "-"
      category: null, // category?.name falsy -> "Uncategorized"
      image: null, // image v-if false branch
      content: "short content", // formatContent <= maxLength branch (no truncation)
    };

    const wrapper = mountPreview(announcement);

    // status != "published" ternary false branch -> "Draft" label.
    expect(wrapper.find(".article-status .badge").text()).toBe("Draft");
    // getStatusBadgeClass("draft") -> "badge bg-info text-dark"
    expect(wrapper.find(".article-status .badge").classes()).toEqual(
      expect.arrayContaining(["badge", "bg-info", "text-dark"])
    );

    // formatDate falsy branch for both dates -> "- - -" pattern.
    expect(wrapper.find(".article-date").text()).toContain("- -");

    // category?.name falsy branch -> "Uncategorized".
    expect(wrapper.find(".article-category").text()).toContain("Uncategorized");

    // image v-if false branch -> no cover.
    expect(wrapper.find(".article-cover").exists()).toBe(false);

    // content v-if true branch, short content -> rendered verbatim (no "...").
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.exists()).toBe(true);
    expect(excerpt.text()).toBe("short content");
  });

  it("strips markup-only long content to an empty excerpt (textContent fallback branch)", () => {
    // 600+ chars of pure markup with no text nodes: after innerHTML assignment
    // tempDiv.textContent is "" (falsy), exercising the `|| tempDiv.innerText
    // || ""` fallback chain in formatContent's truncation branch.
    const markupOnly = "<br>".repeat(200); // 800 chars, zero text content

    const announcement = {
      id: 11,
      title: "Markup Only",
      status: "published",
      publish_date: "2026-01-01T00:00:00Z",
      expire_date: "2026-01-02T00:00:00Z",
      category: { name: "C" },
      image: null,
      content: markupOnly, // truthy -> content v-if true -> formatContent called
    };

    const wrapper = mountPreview(announcement);

    // content v-if true -> excerpt exists; markup-only text strips to "" then
    // truncates to "" + "..." -> "...".
    const excerpt = wrapper.find(".content-excerpt");
    expect(excerpt.exists()).toBe(true);
    expect(excerpt.text()).toBe("...");
  });

  it("renders the no-content empty state (content v-else branch)", () => {
    const announcement = {
      id: 1,
      title: "No Body",
      status: "archived",
      publish_date: "2026-03-15T08:30:00Z",
      expire_date: "2026-03-20T08:30:00Z",
      category: { name: "" }, // empty name -> falsy -> "Uncategorized"
      image: { file: null }, // image truthy (object) -> v-if true, src null
      content: "", // formatContent("") -> "" ; content v-if false -> v-else
    };

    const wrapper = mountPreview(announcement);

    // getStatusBadgeClass("archived") -> "badge bg-warning text-dark"
    expect(wrapper.find(".article-status .badge").classes()).toEqual(
      expect.arrayContaining(["badge", "bg-warning", "text-dark"])
    );

    // category with empty name -> "Uncategorized".
    expect(wrapper.find(".article-category").text()).toContain("Uncategorized");

    // image is a truthy object -> cover v-if true branch even though file is null.
    expect(wrapper.find(".article-cover").exists()).toBe(true);

    // content empty -> v-else branch -> "No content available for preview".
    expect(wrapper.find(".content-excerpt").exists()).toBe(false);
    expect(wrapper.text()).toContain("No content available for preview");
  });

  it("uses the default badge class for an unknown status (getStatusBadgeClass default branch)", () => {
    const announcement = {
      id: 99,
      title: "Weird Status",
      status: "pending", // not published/draft/archived -> default
      publish_date: "2026-05-01T12:00:00Z",
      expire_date: "2026-05-10T12:00:00Z",
      category: { name: "Misc" },
      image: null,
      content: "body",
    };

    const wrapper = mountPreview(announcement);

    // default branch -> "badge bg-secondary"
    expect(wrapper.find(".article-status .badge").classes()).toEqual(
      expect.arrayContaining(["badge", "bg-secondary"])
    );
    // status != "published" -> "Draft" label.
    expect(wrapper.find(".article-status .badge").text()).toBe("Draft");
  });

  it("handles a nullish status in getStatusBadgeClass (status?.toLowerCase() optional-chain branch)", () => {
    const announcement = {
      id: 5,
      title: "No Status",
      status: null, // status?.toLowerCase() -> undefined -> default branch
      publish_date: "2026-06-01T09:00:00Z",
      expire_date: "2026-06-02T09:00:00Z",
      category: { name: "Cat" },
      image: null,
      content: "x",
    };

    const wrapper = mountPreview(announcement);

    // status null -> optional chain short-circuits -> default badge.
    expect(wrapper.find(".article-status .badge").classes()).toEqual(
      expect.arrayContaining(["badge", "bg-secondary"])
    );
  });

  it("emits 'close' from both the close (X) button and the Close button", async () => {
    const announcement = {
      id: 3,
      title: "Closable",
      status: "published",
      publish_date: "2026-01-01T00:00:00Z",
      expire_date: "2026-01-02T00:00:00Z",
      category: { name: "C" },
      image: null,
      content: "c",
    };

    const wrapper = mountPreview(announcement);

    // The X (btn-close) in the header.
    await wrapper.find("button.btn-close").trigger("click");
    // The "Close" outline-secondary button in the actions.
    await wrapper.find("button.btn-outline-secondary").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("emits 'edit' with the announcement id when the Edit button is clicked", async () => {
    const announcement = {
      id: 1234,
      title: "Editable",
      status: "published",
      publish_date: "2026-01-01T00:00:00Z",
      expire_date: "2026-01-02T00:00:00Z",
      category: { name: "C" },
      image: null,
      content: "c",
    };

    const wrapper = mountPreview(announcement);

    await wrapper.find("button.btn-outline-primary").trigger("click");

    expect(wrapper.emitted("edit")).toHaveLength(1);
    expect(wrapper.emitted("edit")[0]).toEqual([1234]);
  });
});
