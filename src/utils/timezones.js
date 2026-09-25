/** Build and cache timezone options for the Business Hours panel. */

function offsetFor(timeZone) {
    const value = new Intl.DateTimeFormat('en', {
        timeZone,
        timeZoneName: 'shortOffset',
    })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value

    // Normalize "GMT+8" → "GMT+08:00"; "GMT+05:30" stays as-is.
    const [, sign = '+', hours = '00', minutes = '00'] =
        value?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/) ?? []
    return `GMT${sign}${hours.padStart(2, '0')}:${minutes}`
}

let cached = null

export function timezoneOptions() {
    if (cached) return cached

    const zones =
        typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

    cached = ['UTC', ...zones]
        .map((zone) => ({
            value: zone,
            label: zone === 'UTC' ? '(GMT+00:00) UTC' : `(${offsetFor(zone)}) ${zone}`,
        }))
        .sort(
            (a, b) =>
                (a.value === 'UTC' ? -1 : b.value === 'UTC' ? 1 : 0) ||
                a.label.localeCompare(b.label, undefined, { numeric: true }) ||
                a.value.localeCompare(b.value),
        )

    return cached
}
