import { afterEach, expect, it, vi } from "vitest";
import { settingsChangeHaptic, settingsClickHaptic, settingsPulse } from "./settings-haptics";

afterEach(() => {
  document.body.replaceChildren();
});

function target(markup: string) {
  document.body.innerHTML = markup;
  return { target: document.body.firstElementChild, isTrusted: true };
}

it("pulses for action clicks and selected controls, not text editing or duplicate checkbox clicks", () => {
  const vibrate = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  settingsClickHaptic(target("<button>Continue</button>"));
  expect(vibrate).toHaveBeenCalledTimes(1);
  const checkbox = target('<input type="checkbox">');
  settingsClickHaptic(checkbox);
  expect(vibrate).toHaveBeenCalledTimes(1);
  settingsChangeHaptic(checkbox);
  expect(vibrate).toHaveBeenCalledTimes(2);
  settingsChangeHaptic(target('<input type="text">'));
  expect(vibrate).toHaveBeenCalledTimes(2);
  settingsChangeHaptic(target("<select><option>One</option></select>"));
  expect(vibrate).toHaveBeenLastCalledWith(8);
});

it("ignores disabled, inert, programmatic and explicitly handled actions", () => {
  const vibrate = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  settingsClickHaptic(target("<button disabled>Disabled</button>"));
  settingsClickHaptic(target("<button inert>Inert</button>"));
  settingsClickHaptic(target("<button data-settings-haptic-handled>Handled</button>"));
  settingsClickHaptic({ ...target("<button>Script</button>"), isTrusted: false });
  settingsChangeHaptic(target('<input type="checkbox" disabled>'));
  expect(vibrate).not.toHaveBeenCalled();
});

it("does not interrupt actions when vibration is unavailable, denied or throws", () => {
  vi.stubGlobal("navigator", {});
  expect(() => settingsPulse()).not.toThrow();
  vi.stubGlobal("navigator", { vibrate: () => false });
  expect(() => settingsPulse()).not.toThrow();
  vi.stubGlobal("navigator", {
    vibrate: () => {
      throw new Error("blocked");
    },
  });
  expect(() => settingsPulse()).not.toThrow();
});
