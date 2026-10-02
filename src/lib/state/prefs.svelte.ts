const AVAILABLE_ONLY_KEY = 'tools:available-only';

/** How this visitor likes the site, remembered in this browser only. */
class Prefs {
  /** Hide the tools that are not built yet. */
  availableOnly = $state(false);
  #started = false;

  /** Reads the saved preferences. Call once in the browser, after the first render. */
  init(): void {
    if (this.#started) return;
    this.#started = true;
    try {
      this.availableOnly = localStorage.getItem(AVAILABLE_ONLY_KEY) === '1';
    } catch {
      /* storage unavailable: the preference then lasts until the tab closes */
    }
  }

  toggleAvailableOnly(): void {
    this.availableOnly = !this.availableOnly;
    try {
      localStorage.setItem(AVAILABLE_ONLY_KEY, this.availableOnly ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }
}

export const prefs = new Prefs();
