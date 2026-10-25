import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Contacts from "@/views/Community/Partials/Contacts.vue";

/*
 * Contacts.vue is a presentational view with no <script> block: no imports, no
 * props, no state, and a fully static template (no v-if / v-else / v-for). There
 * are therefore no logic branches to drive — full per-file coverage is reached by
 * mounting the component and asserting the rendered output is correct.
 */

describe("Contacts.vue", () => {
  const mountContacts = () => mount(Contacts);

  it("renders the Emergency Contacts section with its heading", () => {
    const wrapper = mountContacts();

    const emergency = wrapper.find(".emergency-contact");
    expect(emergency.exists()).toBe(true);
    expect(emergency.find("h5").text()).toBe("Emergency Contacts");
  });

  it("renders all emergency contact tel: links with the correct numbers", () => {
    const wrapper = mountContacts();

    const links = wrapper.findAll(".emergency-contact a");
    // 7 emergency contact buttons in the d-grid.
    expect(links).toHaveLength(7);

    const hrefs = links.map((a) => a.attributes("href"));
    expect(hrefs).toEqual([
      "tel:+270607911911",
      "tel:+270799110911",
      "tel:10111",
      "tel:10177",
      "tel:084124",
      "tel:082911",
      "tel:0839000786",
    ]);
  });

  it("applies the danger / outline button classes to emergency links", () => {
    const wrapper = mountContacts();

    const links = wrapper.findAll(".emergency-contact a");
    // First two are the danger buttons, the rest are outline-secondary.
    expect(links[0].classes()).toContain("btn-danger");
    expect(links[1].classes()).toContain("btn-danger");
    expect(links[2].classes()).toContain("btn-outline-secondary");
    expect(links[6].classes()).toContain("btn-outline-secondary");
  });

  it("renders the Important Contacts card with its heading and collapse target", () => {
    const wrapper = mountContacts();

    const card = wrapper.find(".card.contacts");
    expect(card.exists()).toBe(true);
    expect(card.find(".card-header h5").text()).toBe("Important Contacts");

    // The mobile collapse toggle targets the collapse container by id.
    const toggle = card.find("button[data-bs-toggle='collapse']");
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes("data-bs-target")).toBe("#importantContactsCollapse");
    expect(wrapper.find("#importantContactsCollapse").exists()).toBe(true);
  });

  it("renders every grouped contact heading", () => {
    const wrapper = mountContacts();

    const headings = wrapper
      .findAll(".list-group .list-group-item h6, .list-group .list-group-item-action h6")
      .map((h) => h.text());

    expect(headings).toEqual([
      "PMT BURIAL",
      "Eskom",
      "Rand Water Head Office",
      "Water & Sanitation",
      "City of Tshwane",
      "City of JHB",
      "e-Joburg WhatsApp",
      "Laudium SAPS",
      "Erasmia SAPS (Capt Van De Vyfer)",
      "SAPS Crime Stop",
      "Tshwane Metro Police",
      "Laudium CPF",
      "IIS",
      "Centurion Funeral Directors (non-Muslim)",
    ]);
  });

  it("renders the PMT BURIAL sub-numbers as tel: links", () => {
    const wrapper = mountContacts();

    const pmtItems = wrapper.findAll(".list-group-item")[0].findAll("a");
    expect(pmtItems.map((a) => a.attributes("href"))).toEqual([
      "tel:0827786357",
      "tel:0824786660",
      "tel:0828453875",
      "tel:0790786081",
      "tel:0606062786",
      "tel:0825047315",
    ]);
  });

  it("renders the single-number action links with their tel hrefs and muted numbers", () => {
    const wrapper = mountContacts();

    const eskom = wrapper.find("a[href='tel:0860037566']");
    expect(eskom.exists()).toBe(true);
    expect(eskom.find("h6").text()).toBe("Eskom");
    expect(eskom.find("small.text-muted").text()).toBe("086 003 7566");

    // Spot-check a couple more single-number action entries.
    expect(wrapper.find("a[href='tel:0116820911'] small").text()).toBe(
      "011 682 0911"
    );
    expect(wrapper.find("a[href='tel:0860010111'] h6").text()).toBe(
      "SAPS Crime Stop"
    );
  });

  it("renders the Tshwane Metro Police multi-number list", () => {
    const wrapper = mountContacts();

    const metro = wrapper
      .findAll(".list-group-item")
      .find((item) => item.find("h6").exists() && item.find("h6").text() === "Tshwane Metro Police");

    expect(metro).toBeTruthy();
    const links = metro.findAll("a");
    expect(links.map((a) => a.attributes("href"))).toEqual([
      "tel:0124814000",
      "tel:0808746433",
    ]);
  });
});
