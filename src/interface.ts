import { DateObject } from './types';
import XDate from 'xdate';

const padNumber = (n: number) => n < 10 ? '0' + n : n;

export const xdateToData = (xDate: XDate) => {
    const dateString = xDate.toString('yyyy-MM-dd');

  return {
      year: xDate.getFullYear(),
      month: xDate.getMonth() + 1,
      day: xDate.getDate(),
      timestamp: new XDate(dateString, true).getTime(),
    dateString: dateString
  } as const;
};

const hasTimeStamp =
    (item: object | string): item is { timestamp: number } =>
        !!(item as { timestamp: number }).timestamp;

export const parseDate = (d: string | Date | DateObject | XDate) => {
  if (!d) {
      return new XDate();
  }

    if (hasTimeStamp(d)) { // conventional data timestamp
        new XDate(d.timestamp, true);
    }

    if (d instanceof XDate) { // xdate
        return new XDate(d.toString('yyyy-MM-dd'), true);
    }

    if (d instanceof Date) { // javascript date
        const dateString = [
            d.getFullYear(),
            padNumber((d.getMonth() + 1)),
            padNumber(d.getDate())
        ].join('-');

        return new XDate(dateString, true);
    }

    // TODO: review this assertion, it should assert all props
    const dateObject = d as DateObject;
    if (dateObject.year) {
        const dateString = [
            dateObject.year,
            padNumber(dateObject.month),
            padNumber(dateObject.day)
        ].join('-');

        return new XDate(dateString, true);
    }

    if (d) {
        // FIXME: numbers will not get here ever!
        // timestamp number or date formatted as string
        return new XDate(d as string, true);
    }

    return new XDate();
};
