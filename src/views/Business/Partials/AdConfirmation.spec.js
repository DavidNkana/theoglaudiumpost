import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import AdConfirmation from "@/views/Business/Partials/AdConfirmation.vue";

// A representative slot used across the suite. price * 1.15 => 1150 -> "1150.00"
const slot = {
  name: "Front Page Banner",
  currency: "ZAR",
  price: 1000,
};

function makeWrapper(props = {}) {
  return mount(AdConfirmation, {
    props: {
      orderNumber: "ORD-12345",
      selectedSlot: slot,
      ...props,
    },
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe("AdConfirmation.vue", () => {
  it("renders the PayFast success state and order details by default (paymentMethod defaults to 'payfast')", () => {
    const wrapper = makeWrapper();

    // PayFast confirmation banner (line 4 v-if true)
    expect(wrapper.find("i.bi-check-circle").exists()).toBe(true);
    expect(wrapper.text()).toContain("Payment Successful!");
    expect(wrapper.text()).toContain(
      "Thank you for advertising with Laudium Post."
    );

    // EFT confirmation banner must NOT render (line 14 v-else-if false)
    expect(wrapper.find("i.bi-info-circle").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Order Received");

    // PayFast order details card (line 27 v-if true)
    expect(wrapper.text()).toContain("Order Number:");
    expect(wrapper.text()).toContain("ORD-12345");
    expect(wrapper.text()).toContain("Front Page Banner");

    // Amount Paid = calculateTotal() => 1000 * 1.15 = 1150.00, with currency
    expect(wrapper.text()).toContain("Amount Paid:");
    expect(wrapper.text()).toContain("ZAR");
    expect(wrapper.text()).toContain("1150.00");

    // PayFast "what happens next" copy
    expect(wrapper.text()).toContain(
      "You will receive a\n      confirmation email shortly".replace(
        /\s+/g,
        " "
      )
    );

    // EFT-only payment instructions must NOT render
    expect(wrapper.text()).not.toContain("Payment Instructions");
    expect(wrapper.text()).not.toContain("First National Bank");
  });

  it("calculateTotal computes price * 1.15 fixed to 2 decimals", () => {
    const wrapper = makeWrapper();
    expect(wrapper.vm.calculateTotal()).toBe("1150.00");
  });

  it("renders the EFT received state and instructions, falling back to calculateTotal/orderNumber when eftDetails is null", () => {
    const wrapper = makeWrapper({ paymentMethod: "eft", eftDetails: null });

    // EFT confirmation banner (line 14 v-else-if true)
    expect(wrapper.find("i.bi-info-circle").exists()).toBe(true);
    expect(wrapper.text()).toContain("Order Received");
    expect(wrapper.text()).toContain(
      "Please complete your EFT payment to activate your advertisement."
    );

    // PayFast success banner must NOT render (line 4 v-if false)
    expect(wrapper.find("i.bi-check-circle").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Payment Successful!");

    // EFT order details card (line 68 v-else-if true)
    expect(wrapper.text()).toContain("Order Number:");
    expect(wrapper.text()).toContain("ORD-12345");
    expect(wrapper.text()).toContain("Front Page Banner");

    // Amount Due falls back to calculateTotal() because eftDetails is null
    // (eftDetails?.amount === undefined -> || calculateTotal())
    expect(wrapper.text()).toContain("Amount Due:");
    expect(wrapper.text()).toContain("1150.00");

    // Bank instructions render
    expect(wrapper.text()).toContain("Payment Instructions");
    expect(wrapper.text()).toContain("First National Bank");
    expect(wrapper.text()).toContain("123456789");
    expect(wrapper.text()).toContain("250655");

    // Reference falls back to orderNumber: AD-ORD-12345
    expect(wrapper.text()).toContain("AD-ORD-12345");

    // PayFast card content must NOT render
    expect(wrapper.text()).not.toContain("Amount Paid:");
  });

  it("uses eftDetails.amount and eftDetails.reference when provided (truthy branch of optional-chaining ||)", () => {
    const wrapper = makeWrapper({
      paymentMethod: "eft",
      eftDetails: { amount: "999.99", reference: "REF-XYZ" },
    });

    // Amount Due comes from eftDetails.amount, NOT calculateTotal()
    expect(wrapper.text()).toContain("999.99");
    expect(wrapper.text()).not.toContain("1150.00");

    // Reference comes from eftDetails.reference -> AD-REF-XYZ
    expect(wrapper.text()).toContain("AD-REF-XYZ");
    expect(wrapper.text()).not.toContain("AD-ORD-12345");
  });

  it("falls back per-field: eftDetails present but with falsy amount/reference uses calculateTotal/orderNumber", () => {
    const wrapper = makeWrapper({
      paymentMethod: "eft",
      // amount falsy -> || calculateTotal(); reference falsy -> || orderNumber
      eftDetails: { amount: 0, reference: "" },
    });

    expect(wrapper.text()).toContain("1150.00"); // from calculateTotal()
    expect(wrapper.text()).toContain("AD-ORD-12345"); // from orderNumber
  });

  it("renders neither confirmation banner nor order-details card for an unknown paymentMethod (both v-if/v-else-if false)", () => {
    const wrapper = makeWrapper({ paymentMethod: "crypto" });

    // Neither success nor received banner
    expect(wrapper.find("i.bi-check-circle").exists()).toBe(false);
    expect(wrapper.find("i.bi-info-circle").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Payment Successful!");
    expect(wrapper.text()).not.toContain("Order Received");

    // Neither order-details card
    expect(wrapper.find(".card").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Order Number:");

    // The navigation links still render regardless of payment method
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(2);
  });

  it("always renders the Dashboard and Homepage navigation router-links", () => {
    const wrapper = makeWrapper();
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(2);
    expect(links[0].props("to")).toBe("dashboard");
    expect(links[0].text()).toContain("Go to Dashboard");
    expect(links[1].props("to")).toBe("/");
    expect(links[1].text()).toContain("Return to Homepage");
  });
});
