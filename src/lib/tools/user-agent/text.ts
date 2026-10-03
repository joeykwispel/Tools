const en = {
  input: 'User-agent string',
  mine: 'Mine',
  example: 'Try one',
  choose: 'an example',
  empty: 'Paste a user-agent string, or use the one of this browser.',
  nothing: 'Nothing in this is recognised as a browser, a system or a crawler.',
  read: 'Read as: {summary}.',
  result: 'What it says',
  names: { browser: 'browser', engine: 'engine', os: 'system', device: 'device', app: 'opened in', bot: 'crawler', tool: 'program' },
  kinds: { desktop: 'desktop', mobile: 'phone', tablet: 'tablet', tv: 'television', console: 'game console', unknown: 'not said' },
  unnamed: 'one that does not say which',
  notes: 'To keep in mind',
  note: {
    windows: 'Windows 10 and Windows 11 both say "Windows NT 10.0". The string can not tell them apart.',
    mac: 'Browsers on a Mac have said "10_15_7" since 2020, whatever version of macOS it is.',
    android: 'Chrome on Android says "Android 10; K" for every phone: the real version and model are left out on purpose.',
    ios: 'On an iPhone or iPad every browser runs on WebKit, the engine of Safari. Only the outside differs.',
    ipad: 'An iPad says the same as Safari on a Mac, to get the desktop version of a site. This may be an iPad.',
    bot: 'This is software fetching the page, not a person behind a browser. Anyone can send this string, so it proves nothing.'
  },
  hint: 'A user-agent string is what the sender chooses to say, and browsers say less and less in it. To decide what a page does, test for the feature; this is for reading logs and bug reports.'
};

const nl: typeof en = {
  input: 'User-agent-string',
  mine: 'Die van mij',
  example: 'Probeer er een',
  choose: 'een voorbeeld',
  empty: 'Plak een user-agent-string, of gebruik die van deze browser.',
  nothing: 'Hierin is niets te herkennen als browser, systeem of crawler.',
  read: 'Gelezen als: {summary}.',
  result: 'Wat er staat',
  names: { browser: 'browser', engine: 'engine', os: 'systeem', device: 'apparaat', app: 'geopend in', bot: 'crawler', tool: 'programma' },
  kinds: { desktop: 'desktop', mobile: 'telefoon', tablet: 'tablet', tv: 'televisie', console: 'spelcomputer', unknown: 'staat er niet' },
  unnamed: 'een die niet zegt welke',
  notes: 'Om te onthouden',
  note: {
    windows: 'Windows 10 en Windows 11 zeggen allebei "Windows NT 10.0". De string kan ze niet uit elkaar houden.',
    mac: 'Browsers op een Mac zeggen sinds 2020 "10_15_7", welke versie van macOS het ook is.',
    android: 'Chrome op Android zegt "Android 10; K" voor elke telefoon: de echte versie en het model zijn bewust weggelaten.',
    ios: 'Op een iPhone of iPad draait elke browser op WebKit, de engine van Safari. Alleen de buitenkant verschilt.',
    ipad: 'Een iPad zegt hetzelfde als Safari op een Mac, om de desktopversie van een site te krijgen. Dit kan een iPad zijn.',
    bot: 'Dit is software die de pagina ophaalt, geen mens achter een browser. Iedereen kan deze string sturen, dus het bewijst niets.'
  },
  hint: 'Een user-agent-string is wat de afzender wil zeggen, en browsers zeggen er steeds minder in. Test op de feature om te bepalen wat een pagina doet; dit is voor het lezen van logs en bugmeldingen.'
};

export default { en, nl };
